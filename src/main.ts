import { getURLParams, colorToRgb } from './urlParams';
import { renderMessage, preloadEmotes } from './emotes';
import { createSpeaker } from './tts';
import { ChatMessage, ChatSource, MessagePart } from './chat';
import { twitchChat } from './twitchChat';
import { youtubeChat, DEFAULT_PROXY } from './youtubeChat';

const {
  channel,
  youtube,
  youtubeProxy,
  ignoredUsers,
  noCase,
  color,
  fontSize,
  emoteScale,
  minRepeatCount,
  repeatDuration,
  windowWidth,
  windowHeight,
  ttsVolume,
  ttsRate,
  ttsVoice,
  noTts,
  noRepeating,
  isTopDown,
  isRightSide,
  noBttv,
  noFfz,
  no7tv,
  debugMode,
} = getURLParams();

const cssVariables: Record<string, string> = {
  '--color': colorToRgb[color],
  '--font-size': `${fontSize}px`,
  '--emote-scale': `${emoteScale}`,
  '--width': `${windowWidth}px`,
  '--height': `${windowHeight}px`,
  '--flex-direction': isTopDown ? 'column' : 'column-reverse',
  '--align-items': isRightSide ? 'flex-end' : 'flex-start',
  '--border-style': debugMode ? 'solid' : 'none',
};
for (const [name, value] of Object.entries(cssVariables)) {
  document.documentElement.style.setProperty(name, value);
}

const spaceElement = document.getElementById('space')!;

const speak = noTts
  ? () => {}
  : createSpeaker({voice: ttsVoice, volume: ttsVolume, rate: ttsRate, debugMode});

interface RepeatElements {
  wrapper: HTMLDivElement;
  message: HTMLSpanElement;
  count: HTMLSpanElement;
}

interface RepeatData {
  count: number;
  timeout: ReturnType<typeof setTimeout> | null;
  elements: RepeatElements | null;
  /** First spelling seen; displayed and spoken even when 'nocase' folds later ones in */
  text: string;
  parts: MessagePart[];
}
const activeRepeats: Map<string, RepeatData> = new Map();

const hasEmote = (parts: MessagePart[]) => parts.some((part) => part.type === 'emote');

// Both can run at once: they feed the same counter, so a message repeated across a
// simulcast counts as one combined repeat rather than two separate ones
const sources: ChatSource[] = [];
if (channel) sources.push(twitchChat({channel, noBttv, noFfz, no7tv, debugMode}));
if (youtube) {
  sources.push(youtubeChat({
    id: youtube,
    proxyUrl: youtubeProxy || DEFAULT_PROXY,
    debugMode,
    // Status text replaces everything in the overlay, so only write it when nothing
    // else could have put repeats on screen already
    onStatus: (text) => { if (sources.length === 1) spaceElement.textContent = text; },
  }));
}

if (sources.length === 0) {
  spaceElement.textContent =
    'Add "?twitch=CHANNEL" or "?youtube=@HANDLE" to the end of the URL. Check GitHub for more arguments and info.';
}
for (const source of sources) {
  source(onChatMessage).catch((error) => {
    if (debugMode) console.error(error);
    // One platform failing shouldn't blank out the other's repeats
    if (sources.length === 1) spaceElement.textContent = 'Could not connect to chat. Check the channel name.';
  });
}

function onChatMessage({username, text, parts}: ChatMessage) {
  // Skipped before counting, so an ignored user can't push a message to its
  // repeat threshold or keep an existing repeat alive
  if (username && ignoredUsers.has(username)) return;

  // Emotes are fetched now rather than when the repeat appears, so the images are already
  // cached by the time it does and the layout doesn't jump as they load in
  preloadEmotes(parts);

  // The first spelling seen is the one displayed and spoken; later ones only add to it
  const key = noCase ? text.toLowerCase() : text;
  let repeatData = activeRepeats.get(key);
  if (repeatData) {
    repeatData.count++;
    // Simulcasting delivers the same text from both platforms, but only the side whose
    // emotes resolved carries images. Prefer that rendering however it arrived, otherwise
    // an emote shows as an image or as plain text depending on which chat was quicker.
    if (hasEmote(parts) && !hasEmote(repeatData.parts)) {
      repeatData.parts = parts;
      const elements = repeatData.elements;
      if (elements != null) {
        const message = renderMessage(parts);
        elements.wrapper.replaceChild(message, elements.message);
        elements.message = message;
      }
    }
  } else {
    repeatData = {count: 1, timeout: null, elements: null, text, parts};
    activeRepeats.set(key, repeatData);
  }
  restartTimeout(key, repeatData);
  if (repeatData.count >= minRepeatCount) {
    handleRepeatedMessage(repeatData);
  }
}

function restartTimeout(message: string, repeatData: RepeatData) {
  if (repeatData.timeout != null) clearTimeout(repeatData.timeout);
  repeatData.timeout = setTimeout(() => {
    const elements = repeatData.elements;
    if (elements != null) {
      elements.wrapper.classList.add('shrink_anim');
      elements.wrapper.addEventListener('animationend', () => elements.wrapper.remove(), {once: true});
    }
    activeRepeats.delete(message);
  }, repeatDuration * 1000);
}

function createRepeatElements(parts: MessagePart[]): RepeatElements {
  const count = document.createElement('span');
  count.className = 'count';

  const message = renderMessage(parts);
  const wrapper = document.createElement('div');
  wrapper.className = 'repeat_wrapper spawn_anim';
  wrapper.appendChild(message);
  wrapper.appendChild(count);
  // once: true, otherwise every later pop_anim would re-trigger this handler
  wrapper.addEventListener('animationend', () => {
    wrapper.classList.add('pop_anim');
    count.classList.add('count_pop_anim');
  }, {once: true});

  spaceElement.appendChild(wrapper);
  return {wrapper, message, count};
}

function handleRepeatedMessage(repeatData: RepeatData) {
  if (repeatData.elements == null) {
    repeatData.elements = createRepeatElements(repeatData.parts);
    speak(repeatData.text);
  } else if (!noRepeating && repeatData.count % minRepeatCount == 0) {
    speak(repeatData.text);
  }

  const {wrapper, count} = repeatData.elements;
  // Don't need a space before the 'x', added by renderMessage()
  count.textContent = 'x' + repeatData.count.toString();
  wrapper.classList.remove('pop_anim');
  count.classList.remove('count_pop_anim');
  void wrapper.offsetWidth; // Force a reflow so the animations restart
  wrapper.classList.add('pop_anim');
  count.classList.add('count_pop_anim');
}
