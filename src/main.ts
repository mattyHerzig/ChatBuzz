import * as tmi from 'tmi.js'
import { getURLParams, colorToRgb } from './urlParams';
import { fetchEmotes, insertEmotes } from './emotes';
import { createSpeaker } from './tts';

const {
  channel,
  ignoredUsers,
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
  count: HTMLSpanElement;
}
interface RepeatData {
  count: number;
  timeout: ReturnType<typeof setTimeout> | null;
  elements: RepeatElements | null;
}
const activeRepeats: Map<string, RepeatData> = new Map();

if (!channel) {
  spaceElement.textContent = 'Add "?channel=CHANNEL" to the end of the URL. Check GitHub for more arguments and info.';
} else {
  start(channel).catch((error) => console.error(error));
}

async function start(channel: string) {
  // Emotes first so the very first repeat can already render them
  await fetchEmotes(channel, noBttv, noFfz, no7tv, debugMode);

  const client = new tmi.Client({channels: [channel], connection: {reconnect: true}});
  client.on('message', (_channel, tags, message) => {
    // Skipped before counting, so an ignored user can't push a message to its
    // repeat threshold or keep an existing repeat alive
    if (tags.username && ignoredUsers.has(tags.username.toLowerCase())) return;

    let repeatData = activeRepeats.get(message);
    if (repeatData) {
      repeatData.count++;
    } else {
      repeatData = {count: 1, timeout: null, elements: null};
      activeRepeats.set(message, repeatData);
    }
    restartTimeout(message, repeatData);
    if (repeatData.count >= minRepeatCount) {
      handleRepeatedMessage(message, repeatData);
    }
  });
  await client.connect();
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

function createRepeatElements(message: string): RepeatElements {
  const count = document.createElement('span');
  count.className = 'count';

  const wrapper = document.createElement('div');
  wrapper.className = 'repeat_wrapper spawn_anim';
  wrapper.appendChild(insertEmotes(message));
  wrapper.appendChild(count);
  // once: true, otherwise every later pop_anim would re-trigger this handler
  wrapper.addEventListener('animationend', () => {
    wrapper.classList.add('pop_anim');
    count.classList.add('count_pop_anim');
  }, {once: true});

  spaceElement.appendChild(wrapper);
  return {wrapper, count};
}

function handleRepeatedMessage(message: string, repeatData: RepeatData) {
  if (repeatData.elements == null) {
    repeatData.elements = createRepeatElements(message);
    speak(message);
  } else if (!noRepeating && repeatData.count % minRepeatCount == 0) {
    speak(message);
  }

  const {wrapper, count} = repeatData.elements;
  // Don't need a space before the 'x', added in insertEmotes()
  count.textContent = 'x' + repeatData.count.toString();
  wrapper.classList.remove('pop_anim');
  count.classList.remove('count_pop_anim');
  void wrapper.offsetWidth; // Force a reflow so the animations restart
  wrapper.classList.add('pop_anim');
  count.classList.add('count_pop_anim');
}
