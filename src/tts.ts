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

// Google rate-limits (HTTP 429) and an <audio> element cannot see the status, so failures
// are counted instead. Advancing straight to the next clip on failure turned one 429 into a
// tight loop that hammered the endpoint and kept it rate-limited; backing off breaks that.
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;
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
  let failures = 0;

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
      if (error == null) {
        failures = 0;
        playNext();
        return;
      }

      failures++;
      const wait = Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS);
      if (debugMode) {
        console.error(
          `TTS failed (${failures} in a row), waiting ${wait}ms. Usually rate limiting from ` +
          'translate.google.com; a content blocker does the same thing.', error);
      }
      // current stays set, so speak() keeps queueing rather than starting a parallel clip
      setTimeout(playNext, wait);
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
