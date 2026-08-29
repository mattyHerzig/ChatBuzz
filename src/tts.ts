// Google Translate's TTS endpoint. Unlike SpeechSynthesis -- which the OS renders outside
// the browser, so OBS can neither capture nor route it (obs-browser#404) -- this returns
// MP3 bytes we play in-page, inside the pipeline OBS records from.
//
// It needs no key and no proxy, but it 404s any request carrying an external Referer, so
// index.html sets <meta name="referrer" content="no-referrer">. Without that tag every
// request fails. (StreamElements was used before this and now demands an API key for any
// phrase it hasn't already cached, which meant near-total silence on real chat.)
const TTS_ENDPOINT = 'https://translate.google.com/translate_tts';

// Chat spam can outrun playback; drop the oldest rather than fall minutes behind.
const MAX_QUEUED = 5;

// The endpoint 400s past roughly 200 characters, and Twitch allows 500
const MAX_CHARS = 190;

// A clip that neither ends nor errors -- a stalled request, or OBS suspending media -- used
// to block the queue permanently, so speech stopped until the source was reloaded. These
// bound how long one clip may hold the queue before it is given up on.
const STALL_MS = 10_000;
const OVERRUN_SLACK_MS = 5_000;

export interface TtsConfig {
  /** BCP-47-ish language tag picking the accent, e.g. 'en', 'en-GB', 'fr' */
  language: string;
  volume: number;
  rate: number;
  debugMode: boolean;
}

export function createSpeaker({language, volume, rate, debugMode}: TtsConfig) {
  const queue: string[] = [];
  let current: HTMLAudioElement | null = null;

  function playNext() {
    const message = queue.shift();
    if (message === undefined) {
      current = null;
      return;
    }

    const text = message.slice(0, MAX_CHARS);
    const audio = new Audio(
      `${TTS_ENDPOINT}?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(language)}&q=${encodeURIComponent(text)}`,
    );
    audio.volume = volume;
    audio.playbackRate = rate;
    current = audio;

    let advanced = false;
    let watchdog: ReturnType<typeof setTimeout>;
    const arm = (ms: number) => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => advance(new Error(`TTS clip gave up after ${Math.round(ms)}ms`)), ms);
    };

    // 'ended', 'error', a rejected play() and the watchdog all race; only the first advances
    const advance = (error?: unknown) => {
      if (advanced) return;
      advanced = true;
      clearTimeout(watchdog);
      if (error != null && debugMode) {
        console.error('TTS playback failed - if this repeats, an ad blocker or privacy extension may be blocking translate.google.com', error);
      }
      playNext();
    };

    // Nothing has played yet, so only a load stall is possible at this point
    arm(STALL_MS);
    // Once it is genuinely playing, allow its own length before assuming a stall
    audio.addEventListener('playing', () => arm(((audio.duration || 15) / rate) * 1000 + OVERRUN_SLACK_MS), {once: true});

    audio.addEventListener('ended', () => advance(), {once: true});
    // The event firing at all means failure; audio.error isn't always populated
    audio.addEventListener('error', () => advance(audio.error || new Error('audio failed to load')), {once: true});
    audio.play().catch(advance);
  }

  return function speak(message: string) {
    queue.push(message);
    while (queue.length > MAX_QUEUED) queue.shift();
    if (current == null) playNext();
  };
}
