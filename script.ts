
// @ts-ignore
import * as tmi from 'tmi.js'

// get URL parameters
const urlParams = new URLSearchParams(window.location.search);

// handle 'user' parameter
const username = urlParams.get('user')?.toLowerCase();

// handle 'color' parameter
let color = 'purple';
const colorStr = urlParams.get('color');
if(colorStr) {
  if(colorStr == 'pink' || colorStr == 'red' || colorStr == 'orange' ||
     colorStr == 'yellow' || colorStr == 'green' || colorStr == 'blue' ||
     colorStr == 'purple') color = colorStr;
}

// handle 'min' parameter
let minRepeatCount = 2;
const minReapeatCountStr = urlParams.get('min');
if(minReapeatCountStr) {
  minRepeatCount = parseInt(minReapeatCountStr);
  if(minRepeatCount < 2) minRepeatCount = 2;
}

// handle 'dur' parameter
let repeatTimeout = 7;
const repeatTimeoutStr = urlParams.get('dur');
if(repeatTimeoutStr) {
  repeatTimeout = parseInt(repeatTimeoutStr);
  if(repeatTimeout <= 0) repeatTimeout = 1;
}

// handle 'tts' parameter
let tts = true;
const ttsStr = urlParams.get('tts');
if(ttsStr) {
  if(ttsStr == 'false') tts = false;
}

// handle 'vol' parameter
let vol = 1;
const volStr = urlParams.get('vol');
if(volStr) {
  vol = parseFloat(volStr);
  if(vol < 0) vol = 0;
}
vol *= 0.5;

// throw an error if no username parameter is given
const spaceElement = document.getElementById('space');  
if(!spaceElement) throw new Error('spaceElement null');
if(!username) {
  spaceElement.classList.add('error');
  spaceElement.textContent = 'Add "?user=USERNAME" to the end of the URL. Check GitHub documentation for more arguments and info.';
  throw new Error('username null');
}
// set repeat color
spaceElement.classList.add(color + '_color');

// create the interface for a repeat
interface Repeat {
  message: string;
  count: number;
  timeout: NodeJS.Timeout | null;
  element: Element | null;
}
// keep track of active repeats
const activeRepeats: Repeat[] = [];

// connect to Twitch chat of the given username
const client = new tmi.Client({channels: [username], connection: {reconnect: true}});
client.connect();

// restart the timeout for a repeat
function restartTimeout(repeat: Repeat) {
  // if the repeat already has a timeout, clear it
  if(repeat.timeout != null) clearTimeout(repeat.timeout);
  // set a new timeout for the repeat
  repeat.timeout = setTimeout(() => {
    // if the repeat has been displayed, remove it after applying animations
    if(repeat.element != null) {
      repeat.element.classList.add('shrink_anim');
      repeat.element.addEventListener('animationend', (event) => {
        spaceElement?.removeChild(repeat.element!);
      });
    }
    // plan to remove the repeat from the active repeats after the timeout has ended
    activeRepeats.splice(activeRepeats.findIndex((iRepeat) => iRepeat.message === repeat.message), 1);
  }, repeatTimeout * 1000);
}

// handle new messages in the Twitch chat
client.on('message', (channel: any, tags: any, message: string, self: any) => {
  // check if the message is an active repeat
  const foundRepeat = activeRepeats.find((repeat) => repeat.message === message);
  if(foundRepeat) {
    // if the message is an active repeat
    // restart the found repeat's timeout and increment its count
    restartTimeout(foundRepeat);
    foundRepeat.count++;
    // display the repeat if it has reached the minimum repeat count
    if(foundRepeat.count >= minRepeatCount) {
      const repeatElement = document.createElement('span');
      repeatElement.classList.add('repeat');
      repeatElement.textContent = foundRepeat.message + ' x' + foundRepeat.count.toString();
      // if the repeat has not been displayed before, add it to the space
      if(foundRepeat.element == null) {
        repeatElement.classList.add('spawn_anim');
        repeatElement.addEventListener('animationend', (event) => {
          repeatElement.classList.add('pop_anim');
        });
        foundRepeat.element = spaceElement.appendChild(repeatElement);
        // if text-to-speech is enabled, speak the repeat while it's first displayed
        if(tts) {
          const utterance = new SpeechSynthesisUtterance(foundRepeat.message);
          utterance.volume = vol;
          utterance.rate = 0.8;
          utterance.pitch = 2;
          speechSynthesis.speak(utterance);
        }
      } else {
        // if the repeat has already been displayed, apply a pop animation
        repeatElement.classList.add('pop_anim');
        spaceElement.replaceChild(repeatElement, foundRepeat.element);
        foundRepeat.element = repeatElement;
      }
    }
  } else {
    // if the message is not an active repeat
    // create a new repeat, add it to the active repeats, and start its timeout
    const repeat = {message, count: 1, timeout: null, element: null};
    activeRepeats.push(repeat);
    restartTimeout(repeat);
  }
});
