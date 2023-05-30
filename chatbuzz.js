"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const urlParams = new URLSearchParams(window.location.search);
const username = (_a = urlParams.get('user')) === null || _a === void 0 ? void 0 : _a.toLowerCase();
let minRepeatCount = 2;
const minReapeatCountStr = urlParams.get('min');
if (minReapeatCountStr) {
    minRepeatCount = parseInt(minReapeatCountStr);
    if (minRepeatCount < 2)
        minRepeatCount = 2;
}
let repeatTimeout = 10;
const repeatTimeoutStr = urlParams.get('dur');
if (repeatTimeoutStr) {
    repeatTimeout = parseInt(repeatTimeoutStr);
    if (repeatTimeout < 1)
        minRepeatCount = 1;
}
const spaceElement = document.getElementById('space');
if (!spaceElement)
    throw new Error('spaceElement null');
if (!username) {
    spaceElement.textContent = '?user=<CHANNEL_NAME>"[&min=<MINIMUM_MESSAGE_COUNT>&dur=<MESSAGE_DURATION>]';
    throw new Error('username null');
}
const utterance = new SpeechSynthesisUtterance();
const speechSynthesis = window.speechSynthesis;
utterance.volume = 0.75;
utterance.rate = 0.8;
utterance.pitch = 2;
// @ts-ignore
const tmi = __importStar(require("tmi.js"));
const activeRepeats = [];
const client = new tmi.Client({ channels: [username], connection: { reconnect: true } });
client.connect();
function restartTimeout(repeat) {
    if (repeat.timeout != null)
        clearTimeout(repeat.timeout);
    repeat.timeout = setTimeout(() => {
        if (repeat.element != null) {
            repeat.element.classList.add('shrink_anim');
            repeat.element.addEventListener('animationend', (event) => {
                spaceElement === null || spaceElement === void 0 ? void 0 : spaceElement.removeChild(repeat.element);
            });
        }
        activeRepeats.splice(activeRepeats.findIndex((iRepeat) => iRepeat.message === repeat.message), 1);
    }, repeatTimeout * 1000);
}
client.on('message', (channel, tags, message, self) => {
    const foundRepeat = activeRepeats.find((repeat) => repeat.message === message);
    if (foundRepeat) {
        restartTimeout(foundRepeat);
        foundRepeat.count++;
        if (foundRepeat.count >= minRepeatCount) {
            const repeatElement = document.createElement('span');
            repeatElement.classList.add('repeat');
            repeatElement.textContent = foundRepeat.message + ' x' + foundRepeat.count.toString();
            if (foundRepeat.element == null) {
                repeatElement.classList.add('spawn_anim');
                repeatElement.addEventListener('animationend', (event) => {
                    repeatElement.classList.add('pop_anim');
                });
                foundRepeat.element = spaceElement.appendChild(repeatElement);
                utterance.text = foundRepeat.message;
                speechSynthesis.speak(utterance);
            }
            else {
                repeatElement.classList.add('pop_anim');
                spaceElement.replaceChild(repeatElement, foundRepeat.element);
                foundRepeat.element = repeatElement;
            }
        }
    }
    else {
        const repeat = { message, count: 1, timeout: null, element: null };
        activeRepeats.push(repeat);
        restartTimeout(repeat);
    }
});
