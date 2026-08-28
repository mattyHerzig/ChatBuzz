// Unlike SpeechSynthesis -- which the OS renders outside the browser, so OBS can neither
// capture nor route it (obs-browser#404) -- this returns MP3 bytes we play in-page, inside
// the pipeline OBS records from, with the same voice regardless of the viewer's OS locale.
const TTS_ENDPOINT = 'https://api.streamelements.com/kappa/v2/speech';

// Chat spam can outrun playback; drop the oldest rather than fall minutes behind.
const MAX_QUEUED = 5;

// The endpoint 401s on a voice it doesn't know, and intermittently on ones it does -- a
// voice verified working one day can fail the next. Either way the result was silence with
// no explanation, so fall back to the default rather than dropping the message.
const FALLBACK_VOICE = 'Brian';

export interface TtsConfig {
  voice: string;
  volume: number;
  rate: number;
  debugMode: boolean;
}

export function createSpeaker({voice, volume, rate, debugMode}: TtsConfig) {
  const queue: string[] = [];
  let current: HTMLAudioElement | null = null;

  function play(message: string, withVoice: string, mayFallBack: boolean) {
    const audio = new Audio(`${TTS_ENDPOINT}?voice=${encodeURIComponent(withVoice)}&text=${encodeURIComponent(message)}`);
    audio.volume = volume;
    audio.playbackRate = rate;
    current = audio;

    // 'ended', 'error' and a rejected play() overlap; only the first one advances
    let advanced = false;
    const advance = (error?: unknown) => {
      if (advanced) return;
      advanced = true;
      if (error != null && debugMode) console.error('TTS playback failed', error);
      if (error != null && mayFallBack && withVoice !== FALLBACK_VOICE) play(message, FALLBACK_VOICE, false);
      else playNext();
    };

    audio.addEventListener('ended', () => advance(), {once: true});
    // The event firing at all means failure; audio.error isn't always populated, and
    // relying on it silently skipped the fallback below
    audio.addEventListener('error', () => advance(audio.error || new Error('audio failed to load')), {once: true});
    audio.play().catch(advance);
  }

  function playNext() {
    const message = queue.shift();
    if (message === undefined) {
      current = null;
      return;
    }
    play(message, voice, true);
  }

  return function speak(message: string) {
    queue.push(message);
    while (queue.length > MAX_QUEUED) queue.shift();
    if (current == null) playNext();
  };
}
