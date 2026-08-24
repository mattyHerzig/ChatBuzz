import { MessagePart } from './chat';

let twitchEmoteCodeToId  : Map<string, string> = new Map();
let bttvEmoteCodeToId    : Map<string, string> = new Map();
let ffzEmoteCodeToId     : Map<string, string> = new Map();
let seventvEmoteCodeToId : Map<string, string> = new Map();

interface Emote {
  name?: string;
  code?: string;
  id: string;
}

async function fetchJson(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function toEmoteMap(emotes: unknown, key: 'name' | 'code'): Map<string, string> {
  if (!Array.isArray(emotes)) return new Map();
  return new Map(
    emotes
      .filter((emote: Emote) => emote?.[key] && emote.id)
      .map((emote: Emote) => [emote[key]!, emote.id]),
  );
}

// Uses teklynk's https://github.com/teklynk/twitch_api_public
export async function fetchEmotes(channel: string, noBttv: boolean, noFfz: boolean, no7tv: boolean, debugMode: boolean) {
  const encodedChannel = encodeURIComponent(channel);
  const [globalJson, userJson, bttvJson, ffzJson, seventvJson] = await Promise.all([
    fetchJson('https://twitchapi.teklynk.com/getglobalemotes.php'),
    fetchJson(`https://twitchapi.teklynk.com/getuseremotes.php?channel=${encodedChannel}`),
    noBttv ? null : fetchJson(`https://twitchapi.teklynk.com/getbttvemotes.php?channel=${encodedChannel}`),
    noFfz ? null : fetchJson(`https://twitchapi.teklynk.com/getffzemotes.php?channel=${encodedChannel}`),
    no7tv ? null : fetchJson(`https://twitchapi.teklynk.com/get7tvemotes.php?channel=${encodedChannel}`),
  ]);

  twitchEmoteCodeToId = toEmoteMap(globalJson?.data, 'name');
  for (const [name, id] of toEmoteMap(userJson?.data, 'name')) {
    twitchEmoteCodeToId.set(name, id);
  }
  if (!noBttv) bttvEmoteCodeToId = toEmoteMap(bttvJson, 'code');
  if (!noFfz) ffzEmoteCodeToId = toEmoteMap(ffzJson, 'code');
  if (!no7tv) {
    seventvEmoteCodeToId = toEmoteMap(seventvJson?.emotes, 'name');
    for (const [name, id] of toEmoteMap(seventvJson?.emote_set?.emotes, 'name')) {
      seventvEmoteCodeToId.set(name, id);
    }
  }

  if (debugMode) {
    console.log('twitchEmoteCodeToId', twitchEmoteCodeToId, 'bttvEmoteCodeToId', bttvEmoteCodeToId, 'ffzEmoteCodeToId', ffzEmoteCodeToId, 'seventvEmoteCodeToId', seventvEmoteCodeToId);
  }
}

export function getEmoteImageUrl(word: string) {
  let id = twitchEmoteCodeToId.get(word);
  if (id) return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`
  id = bttvEmoteCodeToId.get(word);
  if (id) return `https://cdn.betterttv.net/emote/${id}/3x`;
  id = ffzEmoteCodeToId.get(word);
  if (id) return `https://cdn.frankerfacez.com/emote/${id}/4`;
  id = seventvEmoteCodeToId.get(word);
  if (id) return `https://cdn.7tv.app/emote/${id}/4x.webp`
  return null;
}

/**
 * Builds the message element from already-resolved parts. Twitch produces these by
 * looking each word up in the emote maps above; YouTube's emoji arrive from the API
 * with their image URLs already attached.
 */
export function renderMessage(parts: MessagePart[]): HTMLSpanElement {
  const messageElement = document.createElement('span');
  messageElement.className = 'message';
  for (const part of parts) {
    if (part.type === 'emote') {
      const emoteElement = document.createElement('img');
      emoteElement.src = part.url;
      emoteElement.alt = part.code; // Falls back to the emote code if the image fails
      emoteElement.className = 'emote';
      messageElement.appendChild(emoteElement);
    } else {
      messageElement.appendChild(document.createTextNode(part.text));
    }
    // Trailing non-breaking space, also separates the last word from the 'xN' count
    messageElement.appendChild(document.createTextNode('\u00A0'));
  }
  return messageElement;
}
