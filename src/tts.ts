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

    // 'ended', 'error' and a rejected play() overlap; only the first one advances
    let advanced = false;
    const advance = (error?: unknown) => {
      if (advanced) return;
      advanced = true;
      if (error != null && debugMode) console.error('TTS playback failed', error);
      playNext();
    };

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
