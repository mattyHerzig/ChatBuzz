import * as tmi from 'tmi.js'
import { getURLParams, colorToRgb } from './urlParams';
import { fetchEmotes, insertEmotes } from './emotes';



const {
  channel,
  color,
  fontSize,
  emoteSize,
  minRepeatCount,
  repeatDuration,
  ttsVolume,
  ttsRate,
  ttsPitch,
  isNoTts,
  isTopDown,
  isRightSide,
  bttvIncluded,
  ffzIncluded,
  seventvIncluded,
} = getURLParams();

document.documentElement.style.setProperty('--color', colorToRgb[color]);
document.documentElement.style.setProperty('--flex-direction', isTopDown ? 'column' : 'column-reverse');
document.documentElement.style.setProperty('--font-size', fontSize.toString() + 'px');
document.documentElement.style.setProperty('--align-items', isRightSide ? 'flex-end' : 'flex-start');

const spaceElement = document.getElementById('space')!;  

if (!channel) {
  spaceElement.textContent = 'Add "?channel=CHANNEL" to the end of the URL. Check GitHub for more arguments and info.';
  throw new Error('channel null');
}



interface RepeatData {
  count: number;
  timeout: NodeJS.Timeout | null;
  element: Element | null;
}
const activeRepeats: Map<string, RepeatData> = new Map();



function speak(message: string) {
  if (isNoTts) return;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.volume = ttsVolume;
  utterance.rate = ttsRate;
  utterance.pitch = ttsPitch;
  speechSynthesis.speak(utterance);
}



const client = new tmi.Client({channels: [channel], connection: {reconnect: true}});
client.connect();

fetchEmotes(channel, bttvIncluded, ffzIncluded, seventvIncluded);

function restartTimeout(message: string) {
  const repeatData = activeRepeats.get(message)!;
  if (repeatData.timeout != null) clearTimeout(repeatData.timeout);
  repeatData.timeout = setTimeout(() => {
    if (repeatData.element != null) {
      repeatData.element.classList.add('shrink_anim');
      repeatData.element.addEventListener('animationend', (event) => {
        spaceElement.removeChild(repeatData.element!);
      });
    }
    activeRepeats.delete(message);
  }, repeatDuration * 1000);
}

client.on('message', (channel: any, tags: any, message: string, self: any) => {
  const foundRepeatData = activeRepeats.get(message);
  if (foundRepeatData) {
    handleRepeatedMessage(message, foundRepeatData);
  } else {
    const repeatData = {count: 1, timeout: null, element: null};
    activeRepeats.set(message, repeatData);
    restartTimeout(message);
  }
});

function handleRepeatedMessage(message: string, repeatData: RepeatData) {
  repeatData.count++;
    restartTimeout(message);
    if (repeatData.count >= minRepeatCount) {
      let countElement: HTMLSpanElement;
      if (repeatData.element == null) {
        const messageElement = insertEmotes(message, emoteSize);
        countElement = document.createElement('span');
        countElement.className = 'count';
        // Don't need a space before the 'x', added in insertEmotes()
        countElement.textContent = 'x' + repeatData.count.toString();
        const repeatWrapper = document.createElement('div');
        repeatWrapper.appendChild(messageElement);
        repeatWrapper.appendChild(countElement);
        repeatWrapper.className = 'repeat_wrapper spawn_anim';
        repeatWrapper.addEventListener('animationend', (event) => {
          repeatWrapper.classList.add('pop_anim');
          countElement.classList.add('count_pop_anim');
        });
        repeatData.element = spaceElement.appendChild(repeatWrapper);
        speak(message);
      } else {
        countElement = repeatData.element.children[1] as HTMLSpanElement;
        // Same as above, "don't need a space before the 'x'..."
        countElement.textContent = 'x' + repeatData.count.toString();
        if (repeatData.count % minRepeatCount == 0) speak(message);
      }
      repeatData.element.classList.remove('pop_anim');
      countElement.classList.remove('count_pop_anim');
      repeatData.element.classList.add('pop_anim');
      countElement.classList.add('count_pop_anim');
      // Replacing the element with itself updates the repeatData's element
      spaceElement.replaceChild(repeatData.element, repeatData.element);
    }
}