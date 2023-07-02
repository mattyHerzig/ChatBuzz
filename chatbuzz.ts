
const urlParams = new URLSearchParams(window.location.search);

const username = urlParams.get('user')?.toLowerCase();

let minRepeatCount = 2;
const minReapeatCountStr = urlParams.get('min');
if(minReapeatCountStr) {
  minRepeatCount = parseInt(minReapeatCountStr);
  if(minRepeatCount < 2) minRepeatCount = 2;
}

let repeatTimeout = 7;
const repeatTimeoutStr = urlParams.get('dur');
if(repeatTimeoutStr) {
  repeatTimeout = parseInt(repeatTimeoutStr);
  if(repeatTimeout < 1) repeatTimeout = 1;
}

let tts = true;
const ttsStr = urlParams.get('tts');
if(ttsStr) {
  if(ttsStr == 'f') tts = false;
}

let vol = 1;
const volStr = urlParams.get('vol');
if(volStr) {
  vol = parseFloat(volStr);
  if(vol < 0) vol = 1;
}
vol *= 0.5;

const spaceElement = document.getElementById('space');  
if(!spaceElement) throw new Error('spaceElement null');
if(!username) {
  spaceElement.textContent = '?user=<CHANNEL_NAME>"';
  spaceElement.textContent += '[&min=_&dur=_&tts=_&vol=_]';
  spaceElement.textContent += '\nwidth: 960px, height: 540px';
  spaceElement.textContent += '\nAdd audio source seperately';
  throw new Error('username null');
}

// @ts-ignore
import * as tmi from 'tmi.js'

interface Repeat {
  message: string;
  count: number;
  timeout: NodeJS.Timeout | null;
  element: Element | null;
}
const activeRepeats: Repeat[] = [];

const client = new tmi.Client({channels: [username], connection: {reconnect: true}});
client.connect();

function restartTimeout(repeat: Repeat) {
  if(repeat.timeout != null) clearTimeout(repeat.timeout);
  repeat.timeout = setTimeout(() => {
    if(repeat.element != null) {
      repeat.element.classList.add('shrink_anim');
      repeat.element.addEventListener('animationend', (event) => {
        spaceElement?.removeChild(repeat.element!);
      });
    }
    activeRepeats.splice(activeRepeats.findIndex((iRepeat) => iRepeat.message === repeat.message), 1);
  }, repeatTimeout * 1000);
}

client.on('message', (channel: any, tags: any, message: string, self: any) => {
  const foundRepeat = activeRepeats.find((repeat) => repeat.message === message);
  if(foundRepeat) {
    restartTimeout(foundRepeat);
    foundRepeat.count++;
    if(foundRepeat.count >= minRepeatCount) {
      const repeatElement = document.createElement('span');
      repeatElement.classList.add('repeat');
      repeatElement.textContent = foundRepeat.message + ' x' + foundRepeat.count.toString();
      if(foundRepeat.element == null) {
        repeatElement.classList.add('spawn_anim');
        repeatElement.addEventListener('animationend', (event) => {
          repeatElement.classList.add('pop_anim');
        });
        foundRepeat.element = spaceElement.appendChild(repeatElement);
        if(tts) {
          const utterance = new SpeechSynthesisUtterance(foundRepeat.message);
          utterance.volume = vol;
          utterance.rate = 0.8;
          utterance.pitch = 2;
          speechSynthesis.speak(utterance);
        }
      } else {
        repeatElement.classList.add('pop_anim');
        spaceElement.replaceChild(repeatElement, foundRepeat.element);
        foundRepeat.element = repeatElement;
      }
    }
  } else {
    const repeat = {message, count: 1, timeout: null, element: null};
    activeRepeats.push(repeat);
    restartTimeout(repeat);
  }
});
