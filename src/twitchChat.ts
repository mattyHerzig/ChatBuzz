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

/** Splits on spaces and swaps any word that is a known emote code. */
function toParts(message: string): MessagePart[] {
  return message.split(' ').map((word): MessagePart => {
    const url = getEmoteImageUrl(word);
    return url ? {type: 'emote', url, code: word} : {type: 'text', text: word};
  });
}

export function twitchChat({channel, noBttv, noFfz, no7tv, debugMode}: TwitchOptions): ChatSource {
  return async (onMessage) => {
    // Emotes first so the very first repeat can already render them
    await fetchEmotes(channel, noBttv, noFfz, no7tv, debugMode);

    const client = new tmi.Client({channels: [channel], connection: {reconnect: true}});
    client.on('message', (_channel, tags, message) => {
      onMessage({
        username: (tags.username || '').toLowerCase(),
        text: message,
        parts: toParts(message),
      });
    });
    await client.connect();
  };
}
