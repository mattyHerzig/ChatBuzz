// Cloudflare Worker proxying YouTube live chat for ChatBuzz.
//
// YouTube sends no CORS headers on any chat endpoint, so a browser can't read live chat
// directly. Scraping lives here rather than in the bundle so a YouTube change is fixed by
// redeploying this Worker instead of rebuilding dist/bundle.js. No API key or account is
// involved -- INNERTUBE_API_KEY is YouTube's own public web-client key.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Strict: these get interpolated into a youtube.com URL
const HANDLE = /^@[A-Za-z0-9._-]{1,60}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {status, headers: {...CORS, 'Content-Type': 'application/json'}});

const match = (html, re) => (html.match(re) || [])[1] || null;

// YouTube serves datacenter IPs (a Worker is one) a degraded page unless the request looks
// like a browser. The consent cookies skip Google's interstitial. Every header here is
// load-bearing: dropping the Sec-Fetch-* trio alone took resolve from 6/6 to 3/6.
const BROWSER_HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'CONSENT=YES+cb; SOCS=CAISNQgQEitib3E3cA',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

const ytFetch = (url, init = {}) =>
  fetch(url, {...init, headers: {...BROWSER_HEADERS, ...(init.headers || {})}});

/**
 * Even with browser headers YouTube intermittently returns a stripped page, so retry with a
 * pause between. Never parse a stripped one: its first "videoId" is some other video
 * entirely, so it yields a confidently wrong answer rather than an obvious failure.
 *
 * Throttling arrives in bursts, so spacing the attempts matters more than their number.
 * This was once 8 attempts with no caching and a client retrying every 5s -- roughly 96
 * page fetches a minute, which provoked the very throttling it was trying to survive. With
 * successful resolves now cached for 5 minutes a channel needs at most one cold resolve in
 * that window, so a handful of well-spaced attempts is cheap.
 */
async function ytFetchPage(url, isUsable, attempts = 6) {
  let html = '';
  let status = 0;
  for (let i = 0; i < attempts; i++) {
    if (i) await new Promise((r) => setTimeout(r, 600));
    const res = await ytFetch(url);
    status = res.status;
    // A missing channel is permanent -- retrying it is pointless, and reporting it as
    // throttling left the overlay saying "Connecting…" forever over a simple typo
    if (status === 404) return {html: '', status};
    if (!res.ok) continue;
    html = await res.text();
    if (isUsable(html)) return {html, status};
  }
  return {html, status};
}

// A browser IP gets `window["ytInitialData"]`, a datacenter IP `var ytInitialData`.
const INITIAL_DATA_MARKERS = ['window["ytInitialData"] =', 'var ytInitialData ='];

// A fully rendered page always carries ytInitialData; the stripped one YouTube sometimes
// hands a Worker has no data blob and an `href="undefined"` canonical link. The live
// markers can't be used here -- they're legitimately absent when a channel is offline.
const isFullPage = (html) =>
  INITIAL_DATA_MARKERS.some((marker) => html.includes(marker)) && !html.includes('href="undefined"');

/** Brace-matched rather than regexed: the object nests deeply and has braces inside strings. */
function extractInitialData(html) {
  const starts = INITIAL_DATA_MARKERS
    .map((marker) => html.indexOf(marker))
    .filter((at) => at !== -1)
    .map((at) => html.indexOf('{', at));
  const start = Math.min(...starts.filter((at) => at !== -1));
  if (!isFinite(start)) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// The page holds several continuations. The one a naive regex finds first is the filtered
// "Top chat" feed -- measured 15 messages against 76 for "Live chat" over the same window.
function liveChatContinuation(html) {
  const renderer = extractInitialData(html)?.contents?.liveChatRenderer;
  const items =
    renderer?.header?.liveChatHeaderRenderer?.viewSelector?.sortFilterSubMenuRenderer?.subMenuItems || [];
  const liveChat = items.find((item) => /live chat/i.test(item?.title || '')) || items[1];

  return (
    liveChat?.continuation?.reloadContinuationData?.continuation ||
    renderer?.continuations?.[0]?.invalidationContinuationData?.continuation ||
    match(html, /"continuation":"([^"]{20,})"/)
  );
}

/**
 * Accepts a handle, a bare channel name, or a UC... id. The bare name matters: a streamer
 * reported being stuck because they typed their name without the '@', which used to be
 * rejected in a way that looked identical to "you aren't live".
 */
function normaliseId(raw) {
  let id = (raw || '').trim();
  if (CHANNEL_ID.test(id)) return id;   // UC ids are case-sensitive
  if (!id.startsWith('@')) id = '@' + id;
  // Handles are not, so folding them means every spelling shares one cache entry
  id = id.toLowerCase();
  return HANDLE.test(id) ? id : null;
}

/**
 * Successful resolves are cached: videoId, key and clientVersion are stable for the whole
 * stream, so this is what keeps repeat requests and extra viewers from each hammering
 * YouTube -- the main defence against its throttling.
 *
 * The continuation token does go stale, which is harmless: the client discards its first
 * poll anyway, so an old token just replays backlog nobody sees. If the stream genuinely
 * ended, polling fails and the client re-resolves.
 */
const RESOLVE_TTL = 300;

async function resolve(rawId, ctx) {
  const id = normaliseId(rawId);
  // retry:false tells the client this will never succeed, so it can say so plainly
  if (!id) return json({error: 'not a valid YouTube channel name, handle or ID', retry: false}, 400);

  const cacheKey = new Request(`https://resolve.chatbuzz/${encodeURIComponent(id)}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const path = id.startsWith('@') ? id : `channel/${id}`;
  const {html, status} = await ytFetchPage(`https://www.youtube.com/${path}/live`, isFullPage);
  if (status === 404) return json({error: `no YouTube channel called "${id}"`, retry: false}, 404);
  // Never got a usable page, so the live state is unknown. Saying "offline" here would be a
  // confident wrong answer for a channel that is streaming; the client retries this quickly.
  if (!isFullPage(html)) return json({error: 'youtube is throttling this proxy', retry: true}, 503);

  // An offline channel still returns 200 with a stale videoId for an old upload. Requiring
  // the canonical link *and* isLiveNow avoids silently attaching to that VOD's chat.
  const videoId = match(html, /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  if (!videoId || !/"isLiveNow":true/.test(html)) return json({live: false});

  const key = match(html, /"INNERTUBE_API_KEY":"([^"]+)"/);
  const clientVersion = match(html, /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  const chat = await ytFetchPage(
    `https://www.youtube.com/live_chat?v=${videoId}`,
    (page) => Boolean(extractInitialData(page)),
  );
  const continuation = chat.html && liveChatContinuation(chat.html);

  // Getting here means YouTube changed its markup: redeploy with updated patterns
  if (!key || !clientVersion || !continuation) return json({error: 'could not parse YouTube page', retry: true}, 502);

  const ok = json({live: true, videoId, key, clientVersion, continuation});
  ok.headers.set('Cache-Control', `max-age=${RESOLVE_TTL}`);
  if (ctx) ctx.waitUntil(caches.default.put(cacheKey, ok.clone()));
  return ok;
}

// TODO: 7TV/BTTV emotes typed in YouTube chat stay as plain text here. Their browser
// extensions do render them, but neither exposes a YouTube channel lookup: 7TV's REST API
// answers `invalid platform` for youtube (twitch/kick/discord return `user not found`), and
// BTTV's 404 is meaningless -- it returns the same for a provider that doesn't exist at all.
// Worth revisiting if either ships a YouTube route; don't re-derive it from the 404s.
function toParts(runs) {
  const parts = [];
  let text = '';
  for (const run of runs || []) {
    if (typeof run.text === 'string') {
      parts.push({type: 'text', text: run.text});
      text += run.text;
      continue;
    }
    if (!run.emoji) continue;
    const thumbnails = run.emoji.image?.thumbnails || [];
    const url = thumbnails[thumbnails.length - 1]?.url;
    const shortcut = run.emoji.shortcuts?.[0] || '';

    if (run.emoji.isCustomEmoji && url) {
      parts.push({type: 'emote', url, code: shortcut});
      text += shortcut;
    } else {
      // For standard emoji emojiId is the character ("👀") and shortcuts holds ":eyes:";
      // using the character keeps TTS from reading out "colon eyes colon"
      const character = run.emoji.emojiId || shortcut;
      parts.push({type: 'text', text: character});
      text += character;
    }
  }
  return {parts, text};
}

async function poll({continuation, key, clientVersion} = {}) {
  if (typeof continuation !== 'string' || typeof key !== 'string' || typeof clientVersion !== 'string') {
    return json({error: 'continuation, key and clientVersion are required'}, 400);
  }

  const res = await ytFetch(
    `https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({context: {client: {clientName: 'WEB', clientVersion}}, continuation}),
    },
  );
  if (!res.ok) return json({error: 'chat poll failed', status: res.status}, 502);

  const live = (await res.json())?.continuationContents?.liveChatContinuation || {};
  const messages = [];
  for (const action of live.actions || []) {
    const item = action?.addChatItemAction?.item;
    const renderer = item?.liveChatTextMessageRenderer || item?.liveChatPaidMessageRenderer;
    if (!renderer) continue;
    const {parts, text} = toParts(renderer.message?.runs);
    if (!parts.length) continue;
    messages.push({
      author: renderer.authorName?.simpleText || '',
      // Stable, unlike the display name, so `ignore` can survive a rename
      authorId: renderer.authorExternalChannelId || '',
      // Real send time (ms). Lets the client replay the true gaps between messages
      // instead of inventing an even spread across the poll interval.
      sentAt: Number(renderer.timestampUsec) / 1000 || 0,
      text,
      parts,
    });
  }

  // The shape varies with chat state
  const c = (live.continuations || [])[0] || {};
  const next = c.timedContinuationData || c.invalidationContinuationData || c.reloadContinuationData || {};
  return json({messages, continuation: next.continuation || null, timeoutMs: next.timeoutMs || 5000});
}

export default {
  async fetch(request, _env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, {headers: CORS});
    const url = new URL(request.url);
    try {
      if (url.pathname === '/resolve' && request.method === 'GET') {
        return await resolve(url.searchParams.get('id'), ctx);
      }
      if (url.pathname === '/poll' && request.method === 'POST') {
        return await poll(await request.json());
      }
      return json({error: 'not found'}, 404);
    } catch (error) {
      return json({error: String(error)}, 500);
    }
  },
};
