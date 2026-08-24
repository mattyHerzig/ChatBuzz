import * as tmi from 'tmi.js';
import { ChatMessage, ChatSource, MessagePart } from './chat';
import { fetchEmotes, getEmoteImageUrl } from './emotes';

export interface TwitchOptions {
  channel: string;
  noBttv: boolean;
  noFfz: boolean;
  no7tv: boolean;
  debugMode: boolean;
}

/** Splits a Twitch message on spaces and swaps any word that is a known emote code. */
function toParts(message: string): MessagePart[] {
  return message.split(' ').map((word): MessagePart => {
    const url = getEmoteImageUrl(word);
    return url ? {type: 'emote', url, code: word} : {type: 'text', text: word};
  });
}

export function twitchChat(options: TwitchOptions): ChatSource {
  return async (onMessage) => {
    const {channel, noBttv, noFfz, no7tv, debugMode} = options;
    // Emotes first so the very first repeat can already render them
    await fetchEmotes(channel, noBttv, noFfz, no7tv, debugMode);

    const client = new tmi.Client({channels: [channel], connection: {reconnect: true}});
    client.on('message', (_channel, tags, message) => {
      const chatMessage: ChatMessage = {
        username: (tags.username || '').toLowerCase(),
        text: message,
        parts: toParts(message),
      };
      onMessage(chatMessage);
    });
    await client.connect();
  };
}
