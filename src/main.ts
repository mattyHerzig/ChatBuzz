import { getURLParams, colorToRgb } from './urlParams';
import { renderMessage, preloadEmotes, whenEmotesReady } from './emotes';
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
  ttsLanguage,
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

// Read from CSS so the removal below cannot drift out of sync with the animation
const shrinkMs =
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--shrink-duration')) * 1000 || 250;

const speak = noTts
  ? () => {}
  : createSpeaker({language: ttsLanguage, volume: ttsVolume, rate: ttsRate, debugMode});

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
  /** True while waiting on emote images, so we only start that wait once */
  awaitingEmotes?: boolean;
  /** Set on expiry, so a wait that finishes afterwards doesn't revive it */
  expired?: boolean;
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
    // Writing status replaces the overlay's contents, so only do it when there is nothing
    // to lose: not while Twitch may have drawn repeats, and not while repeats are on
    // screen. A brief reconnect mid-stream must not wipe what the viewer is looking at.
    onStatus: (text) => {
      if (sources.length === 1 && spaceElement.childElementCount === 0) {
        spaceElement.textContent = text;
      }
    },
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
  scheduleExpiry(key, repeatData);
  if (repeatData.count >= minRepeatCount) {
    handleRepeatedMessage(repeatData);
  }
}

function scheduleExpiry(key: string, repeatData: RepeatData) {
  if (repeatData.timeout != null) clearTimeout(repeatData.timeout);
  repeatData.timeout = setTimeout(() => {
    activeRepeats.delete(key);
    repeatData.expired = true;
    if (repeatData.elements == null) return;

    const {wrapper} = repeatData.elements;
    // height cannot animate from auto, so hand the animation the measured value
    wrapper.style.setProperty('--shrink-from', `${wrapper.offsetHeight}px`);
    wrapper.classList.add('shrink_anim');
    // Matched by name because animationend bubbles; a child's animation would otherwise
    // remove this early. The timeout covers OBS not always delivering the event.
    wrapper.addEventListener('animationend', (event) => {
      if (event.animationName === 'Shrink') wrapper.remove();
    });
    setTimeout(() => wrapper.remove(), shrinkMs + 100);
  }, repeatDuration * 1000);
}

function createRepeatElements(parts: MessagePart[]): RepeatElements {
  const count = document.createElement('span');
  count.className = 'count';

  const message = renderMessage(parts);
  const wrapper = document.createElement('div');
  wrapper.className = 'repeat_wrapper';
  wrapper.appendChild(message);
  wrapper.appendChild(count);

  spaceElement.appendChild(wrapper);
  return {wrapper, message, count};
}

function handleRepeatedMessage(repeatData: RepeatData) {
  if (repeatData.elements == null) {
    // Show it only once its emotes can render, otherwise the images pop in afterwards and
    // shove the count sideways. Usually already true thanks to preloading, so this resolves
    // immediately; the count keeps climbing meanwhile and the first paint uses the latest.
    if (repeatData.awaitingEmotes) return;
    repeatData.awaitingEmotes = true;
    void whenEmotesReady(repeatData.parts).then(() => {
      repeatData.awaitingEmotes = false;
      if (repeatData.expired) return;
      repeatData.elements = createRepeatElements(repeatData.parts);
      speak(repeatData.text);
      paintCount(repeatData);
    });
    return;
  }

  if (!noRepeating && repeatData.count % minRepeatCount == 0) speak(repeatData.text);
  paintCount(repeatData);
}

/** Writes the current count and replays the pop on both the wrapper and the counter. */
function paintCount(repeatData: RepeatData) {
  if (repeatData.elements == null) return;
  const {wrapper, count} = repeatData.elements;
  // Don't need a space before the 'x', added by renderMessage()
  count.textContent = 'x' + repeatData.count.toString();
  wrapper.classList.remove('pop_anim');
  count.classList.remove('count_pop_anim');
  void wrapper.offsetWidth; // Force a reflow so the animations restart
  wrapper.classList.add('pop_anim');
  count.classList.add('count_pop_anim');
}
