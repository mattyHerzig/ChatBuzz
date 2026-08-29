import * as tmi from 'tmi.js';
import { ChatSource, MessagePart } from './chat';
import { fetchEmotes, getEmoteImageUrl } from './emotes';

export interface TwitchOptions {
  channel: string;
  noBttv: boolean;
  noFfz: boolean;
  no7tv: boolean;
  debugMode: boolean;
}

/** Splits on spaces and swaps any word that is a known third-party emote code. */
function toWords(text: string): MessagePart[] {
  return text.split(' ').filter(Boolean).map((word): MessagePart => {
    const url = getEmoteImageUrl(word);
    return url ? {type: 'emote', url, code: word} : {type: 'text', text: word};
  });
}

/**
 * Twitch tags every message with the native emotes it contains, and tmi.js hands it over
 * already parsed as {emoteId: ['start-end', ...]}. Using it is what makes subscriber emotes
 * work: a viewer can use emotes from any channel they subscribe to, which no per-channel
 * list we fetch could know about. The indices count code points, not UTF-16 units.
 */
function twitchEmoteRanges(emotes: {[id: string]: string[]} | undefined) {
  const ranges: {start: number; end: number; id: string}[] = [];
  for (const [id, spans] of Object.entries(emotes ?? {})) {
    for (const span of spans) {
      const [start, end] = span.split('-').map(Number);
      if (Number.isFinite(start) && Number.isFinite(end)) ranges.push({start, end, id});
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

export function toParts(message: string, emotes?: {[id: string]: string[]}): MessagePart[] {
  const ranges = twitchEmoteRanges(emotes);
  if (ranges.length === 0) return toWords(message);

  // Spread, because the tag's indices are code points and emoji are surrogate pairs
  const chars = [...message];
  const parts: MessagePart[] = [];
  let cursor = 0;
  for (const {start, end, id} of ranges) {
    if (start > cursor) parts.push(...toWords(chars.slice(cursor, start).join('')));
    parts.push({
      type: 'emote',
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`,
      code: chars.slice(start, end + 1).join(''),
    });
    cursor = end + 1;
  }
  return [...parts, ...toWords(chars.slice(cursor).join(''))];
}

export function twitchChat({channel, noBttv, noFfz, no7tv, debugMode}: TwitchOptions): ChatSource {
  return async (onMessage) => {
    // Emotes first so the very first repeat can already render them
    await fetchEmotes(channel, noBttv, noFfz, no7tv, debugMode);

    const client = new tmi.Client({channels: [channel], connection: {reconnect: true}});
    client.on('message', (_channel, tags, message) => {
      onMessage({
        username: (tags.username || '').toLowerCase(),
        userId: tags['user-id'],
        text: message,
        parts: toParts(message, tags.emotes),
      });
    });
    await client.connect();
  };
}
