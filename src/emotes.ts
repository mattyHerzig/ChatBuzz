let globalEmoteCodeToId  : Map<string, string> = new Map();
let channelEmoteCodeToId : Map<string, string> = new Map();
let bttvEmoteCodeToId    : Map<string, string> = new Map();
let ffzEmoteCodeToId     : Map<string, string> = new Map();
let seventvEmoteCodeToId : Map<string, string> = new Map();

// Uses teklynk's https://github.com/teklynk/twitch_api_public
export async function fetchEmotes(channel: string, bttvIncluded: boolean, ffzIncluded: boolean, seventvIncluded: boolean) {
  let response = await fetch('https://twitchapi.teklynk.com/getglobalemotes.php');
  let emotes = (await response.json())['data'];
  globalEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['name'], emote['id']])); 
  
  response = await fetch(`https://twitchapi.teklynk.com/getuseremotes.php?channel=${channel}`);
  emotes = (await response.json())['data'];
  channelEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['name'], emote['id']])); 

  if (bttvIncluded) {
    response = await fetch(`https://twitchapi.teklynk.com/getbttvemotes.php?channel=${channel}`);
    emotes = await response.json();
    bttvEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['code'], emote['id']]));
  }
  if (ffzIncluded) {
    response = await fetch(`https://twitchapi.teklynk.com/getffzemotes.php?channel=${channel}`);
    emotes = await response.json();
    ffzEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['code'], emote['id']]));
  }
  if (seventvIncluded) {
    response = await fetch(`https://twitchapi.teklynk.com/get7tvemotes.php?channel=${channel}`);
    emotes = await response.json();
    seventvEmoteCodeToId = new Map(emotes.map((emote: any) => [emote['code'], emote['id']]));
  }
}

function getEmoteImageUrl(word: string, emoteSize: number) {
  let id = globalEmoteCodeToId.get(word);
  if (id) return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/${emoteSize}.0`
  id = channelEmoteCodeToId.get(word);
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
