// Cloudflare Worker proxying YouTube live chat for ChatBuzz.
//
// YouTube serves no CORS headers on any chat endpoint (innertube answers cross-origin
// requests with 403), so a browser cannot read live chat directly. This relays it, and
// does the HTML scraping here rather than in the ChatBuzz bundle: the regexes below are
// the fragile part, and server-side they can be fixed by redeploying this Worker instead
// of rebuilding and recommitting dist/bundle.js.
//
// No API key or account is involved. The INNERTUBE_API_KEY read off the page is YouTube's
// own public web-client key, not a credential belonging to anyone.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Strict, because these get interpolated into a youtube.com URL -- anything looser would
// let a caller point the Worker at an arbitrary path
const HANDLE = /^@[A-Za-z0-9._-]{1,60}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {...CORS, 'Content-Type': 'application/json'},
  });

// YouTube serves datacenter IPs (which is what a Worker is) a degraded page unless the
// request looks like a real browser. The consent cookies skip Google's interstitial.
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
 * Fetches a YouTube page, retrying while it comes back degraded. Even with browser-like
 * headers YouTube intermittently serves Workers a stripped page -- one with
 * `href="undefined"` and no live markers -- so give it a couple of chances.
 */
async function ytFetchPage(url, isUsable, attempts = 3) {
  let html = '';
  for (let i = 0; i < attempts; i++) {
    const res = await ytFetch(url);
    if (!res.ok) continue;
    html = await res.text();
    if (isUsable(html)) return html;
  }
  return html;
}

const match = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};

// YouTube uses different assignment forms depending on which page variant it serves --
// a browser IP tends to get `window["ytInitialData"]`, a datacenter IP `var ytInitialData`.
const INITIAL_DATA_MARKERS = ['window["ytInitialData"] =', 'var ytInitialData ='];

// Pulls the ytInitialData blob out of a page. Brace-matched rather than regexed, because
// the object is deeply nested and contains braces inside strings.
function extractInitialData(html) {
  let start = -1;
  for (const marker of INITIAL_DATA_MARKERS) {
    const at = html.indexOf(marker);
    if (at === -1) continue;
    const candidate = html.indexOf('{', at + marker.length);
    if (candidate !== -1 && (start === -1 || candidate < start)) start = candidate;
  }
  if (start === -1) return null;

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

// The live_chat page carries several continuation tokens. The first one a naive regex
// finds is the filtered "Top chat" feed, which drops most messages -- measured at 15
// against 76 for "Live chat" over the same window. Always prefer the unfiltered feed.
function liveChatContinuation(html) {
  const renderer = extractInitialData(html)?.contents?.liveChatRenderer;
  const subMenuItems =
    renderer?.header?.liveChatHeaderRenderer?.viewSelector?.sortFilterSubMenuRenderer?.subMenuItems || [];

  const liveChat =
    subMenuItems.find((item) => /live chat/i.test(item?.title || '')) || subMenuItems[1];

  return (
    liveChat?.continuation?.reloadContinuationData?.continuation ||
    renderer?.continuations?.[0]?.invalidationContinuationData?.continuation ||
    match(html, /"continuation":"([^"]{20,})"/)
  );
}

async function resolve(id) {
  if (!id || (!HANDLE.test(id) && !CHANNEL_ID.test(id))) {
    return json({error: 'id must be a @handle or a UC... channel id'}, 400);
  }

  const path = id.startsWith('@') ? id : `channel/${id}`;
  // A usable channel page has the innertube config; the live markers may legitimately be
  // absent when the channel simply isn't streaming, so they can't gate the retry
  const html = await ytFetchPage(
    `https://www.youtube.com/${path}/live`,
    (page) => /"INNERTUBE_API_KEY":"/.test(page) && !/href="undefined"/.test(page),
  );
  if (!html) return json({error: 'could not reach channel'}, 502);

  // An offline channel still returns 200 with a stale videoId for an old upload, but no
  // canonical watch link and no isLiveNow. Requiring both avoids silently attaching to a VOD.
  const videoId = match(html, /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  const isLive = /"isLiveNow":true/.test(html);
  if (!videoId || !isLive) return json({live: false});

  const key = match(html, /"INNERTUBE_API_KEY":"([^"]+)"/);
  const clientVersion = match(html, /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);

  const chatHtml = await ytFetchPage(
    `https://www.youtube.com/live_chat?v=${videoId}`,
    (page) => Boolean(extractInitialData(page)),
  );
  if (!chatHtml) return json({error: 'could not reach live chat'}, 502);
  const continuation = liveChatContinuation(chatHtml);

  if (!key || !clientVersion || !continuation) {
    // Reaching here means YouTube changed its markup -- redeploy with updated regexes
    return json({error: 'could not parse YouTube page'}, 502);
  }
  return json({live: true, videoId, key, clientVersion, continuation});
}

function toParts(runs) {
  const parts = [];
  let text = '';
  for (const run of runs || []) {
    if (typeof run.text === 'string') {
      parts.push({type: 'text', text: run.text});
      text += run.text;
      continue;
    }
    const emoji = run.emoji;
    if (!emoji) continue;
    const thumbnails = emoji.image?.thumbnails || [];
    const url = thumbnails[thumbnails.length - 1]?.url;
    const shortcut = emoji.shortcuts?.[0] || '';

    if (emoji.isCustomEmoji && url) {
      // Channel/membership emoji: only an image represents these
      parts.push({type: 'emote', url, code: shortcut});
      text += shortcut;
    } else {
      // Standard emoji: emojiId is the character itself ("👀"), while shortcuts holds
      // ":eyes:". Use the character so it renders normally and TTS doesn't read out
      // "colon eyes colon".
      const character = emoji.emojiId || shortcut;
      parts.push({type: 'text', text: character});
      text += character;
    }
  }
  return {parts, text};
}

async function poll(body) {
  const {continuation, key, clientVersion} = body || {};
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

  const data = await res.json();
  const live = data?.continuationContents?.liveChatContinuation || {};

  const messages = [];
  for (const action of live.actions || []) {
    const item = action?.addChatItemAction?.item;
    const renderer = item?.liveChatTextMessageRenderer || item?.liveChatPaidMessageRenderer;
    if (!renderer) continue;
    const {parts, text} = toParts(renderer.message?.runs);
    if (!parts.length) continue;
    messages.push({
      author: renderer.authorName?.simpleText || '',
      authorId: renderer.authorExternalChannelId || '',
      text,
      parts,
    });
  }

  // YouTube uses several continuation shapes depending on chat state
  const c = (live.continuations || [])[0] || {};
  const next = c.timedContinuationData || c.invalidationContinuationData || c.reloadContinuationData || {};

  return json({
    messages,
    continuation: next.continuation || null,
    timeoutMs: next.timeoutMs || 5000,
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, {headers: CORS});
    const url = new URL(request.url);
    try {
      if (url.pathname === '/resolve' && request.method === 'GET') {
        return await resolve(url.searchParams.get('id'));
      }
      if (url.pathname === '/poll' && request.method === 'POST') {
        return await poll(await request.json());
      }
      // Diagnostic for when YouTube starts serving this Worker something unexpected,
      // which is the most likely way this breaks
      if (url.pathname === '/debug' && request.method === 'GET') {
        const id = url.searchParams.get('id') || '@LofiGirl';
        if (!HANDLE.test(id) && !CHANNEL_ID.test(id)) return json({error: 'bad id'}, 400);
        const path = id.startsWith('@') ? id : `channel/${id}`;
        const channelRes = await ytFetch(`https://www.youtube.com/${path}/live`);
        const channelHtml = await channelRes.text();
        const videoId = match(channelHtml, /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
        const step1 = {
          status: channelRes.status,
          bytes: channelHtml.length,
          videoId,
          isLiveNow: /"isLiveNow":true/.test(channelHtml),
          key: match(channelHtml, /"INNERTUBE_API_KEY":"([^"]+)"/),
          clientVersion: match(channelHtml, /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/),
        };
        if (!videoId) return json({step1, note: 'no canonical videoId; stopping'});

        const chatRes = await ytFetch(`https://www.youtube.com/live_chat?v=${videoId}`);
        const chatHtml = await chatRes.text();
        const initial = extractInitialData(chatHtml);
        const subMenuItems =
          initial?.contents?.liveChatRenderer?.header?.liveChatHeaderRenderer?.viewSelector
            ?.sortFilterSubMenuRenderer?.subMenuItems || [];
        return json({
          step1,
          step2: {
            status: chatRes.status,
            bytes: chatHtml.length,
            hasInitialDataMarker: chatHtml.includes('window["ytInitialData"]'),
            initialDataParsed: Boolean(initial),
            subMenuTitles: subMenuItems.map((i) => i?.title),
            continuationFound: Boolean(liveChatContinuation(chatHtml)),
            markerForms: [...chatHtml.matchAll(/.{25}ytInitialData.{25}/g)].map((m) => m[0]).slice(0, 3),
          },
        });
      }
      return json({error: 'not found'}, 404);
    } catch (error) {
      return json({error: String(error)}, 500);
    }
  },
};
