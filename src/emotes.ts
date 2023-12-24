let twitchEmoteCodeToId  : Map<string, string>;
let bttvEmoteCodeToId    : Map<string, string>;
let ffzEmoteCodeToId     : Map<string, string>;
let seventvEmoteCodeToId : Map<string, string>;

// Uses teklynk's https://github.com/teklynk/twitch_api_public
export async function fetchEmotes(channel: string, noBttv: boolean, noFfz: boolean, no7tv: boolean, debugMode: boolean) {
  let response = await fetch('https://twitchapi.teklynk.com/getglobalemotes.php');
  let emotes = (await response.json())['data'];
  twitchEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['name'], emote['id']])); 
  response = await fetch(`https://twitchapi.teklynk.com/getuseremotes.php?channel=${channel}`);
  emotes = (await response.json())['data'];
  emotes.forEach((emote: any) => twitchEmoteCodeToId.set(emote['name'], emote['id']));
  if (!noBttv) {
    response = await fetch(`https://twitchapi.teklynk.com/getbttvemotes.php?channel=${channel}`);
    emotes = await response.json();
    bttvEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['code'], emote['id']]));
  }
  if (!noFfz) {
    response = await fetch(`https://twitchapi.teklynk.com/getffzemotes.php?channel=${channel}`);
    emotes = await response.json();
    ffzEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['code'], emote['id']]));
  }
  if (!no7tv) {
    response = await fetch(`https://twitchapi.teklynk.com/get7tvemotes.php?channel=${channel}`);
    emotes = await response.json();
    seventvEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['code'], emote['id']]));
  }
  if (debugMode) console.log(twitchEmoteCodeToId, bttvEmoteCodeToId, ffzEmoteCodeToId, seventvEmoteCodeToId);
}

function getEmoteImageUrl(word: string, emoteSize: number) {
  let id = twitchEmoteCodeToId.get(word);
  if (id) return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/${emoteSize}.0`
  id = bttvEmoteCodeToId.get(word);
  if (id) return `https://cdn.betterttv.net/emote/${id}/${emoteSize}x`;
  id = ffzEmoteCodeToId.get(word);
  if (id) return `https://cdn.frankerfacez.com/emote/${id}/${emoteSize}`;
  id = seventvEmoteCodeToId.get(word);
  if (id) return `https://cdn.7tv.app/emote/${id}/${emoteSize}x.webp`
  return null;
}

export function insertEmotes(message: string, emoteSize: number) : HTMLSpanElement { 
  let messageElement = document.createElement('span');
  messageElement.className = 'message';
  let words = message.split(' ');
  words.forEach((word, index) => {
    const emoteImageUrl = getEmoteImageUrl(word, emoteSize);
    if (emoteImageUrl) {
      let emoteElement = document.createElement('img');
      emoteElement.src = emoteImageUrl;
      messageElement.appendChild(emoteElement);
    } else {
      let textNode = document.createTextNode(word);
      messageElement.appendChild(textNode);
    }
    let spaceNode = document.createElement('span');
    spaceNode.innerHTML = '&nbsp;';
    messageElement.appendChild(spaceNode);
  });
  return messageElement;
}
