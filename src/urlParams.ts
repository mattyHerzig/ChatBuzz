export const colorToRgb: Record<string, string> = {
  'pink'  : 'rgb(228, 81, 228)',
  'red'   : 'rgb(228, 81, 81)' ,
  'orange': 'rgb(228, 140, 81)',
  'yellow': 'rgb(226, 226, 66)',
  'green' : 'rgb(81, 228, 98)' ,
  'blue'  : 'rgb(98, 81, 228)' ,
  'purple': 'rgb(163, 81, 228)',
};

const isPositive    = (n: number) => n > 0;
const isNonNegative = (n: number) => n >= 0;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export function getURLParams() {
  const urlParams = new URLSearchParams(window.location.search);

  // Falls back to the default when the parameter is absent or fails isValid()
  const num = (
    name: string,
    fallback: number,
    isValid: (n: number) => boolean = Number.isFinite,
    parse: (s: string) => number = parseFloat,
  ) => {
    const raw = urlParams.get(name);
    if (!raw) return fallback;
    const value = parse(raw);
    return isValid(value) ? value : fallback;
  };

  const int = (name: string, fallback: number, isValid?: (n: number) => boolean) =>
    num(name, fallback, isValid, (s) => parseInt(s, 10));

  // Present without a value counts as true e.g. "&topdown" == "&topdown=true"
  const flag = (name: string) => urlParams.has(name) && urlParams.get(name) !== 'false';

  const channel = urlParams.get('channel');
  const ignore = urlParams.get('ignore');
  const color = urlParams.get('color');
  const voice = urlParams.get('voice');

  return {
    channel: channel && channel.toLowerCase(),
    // Lower-cased like 'channel', since Twitch logins are case-insensitive.
    // filter(Boolean) tolerates stray/trailing commas e.g. "ignore=nightbot,"
    ignoredUsers: new Set(
      (ignore ?? '').split(',').map((user) => user.trim().toLowerCase()).filter(Boolean),
    ),
    color: color && color in colorToRgb ? color : 'yellow',
    fontSize:       num('fontsize',   30.0, isPositive),
    emoteScale:     num('emotescale',  1.3, isPositive),
    minRepeatCount: int('min',           3, (n) => n >= 1),
    repeatDuration: num('dur',         7.0, isPositive),
    windowWidth:    int('width',       800, isPositive),
    windowHeight:   int('height',      600, isPositive),
    // Clamped rather than rejected, so "vol=2" means "as loud as it goes"
    ttsVolume:      clamp(num('vol',   0.5, isNonNegative), 0, 1),
    ttsRate:        clamp(num('rate',  1.0, isPositive), 0.25, 4),
    // Capitalised because the TTS endpoint is case-sensitive and 401s on anything else,
    // which would silently kill all speech -- and 'channel' is case-insensitive, so
    // users reasonably expect the same here
    ttsVoice:       voice ? voice.charAt(0).toUpperCase() + voice.slice(1).toLowerCase() : 'Brian',
    noTts:       flag('notts'),
    noRepeating: flag('norepeat'),
    isTopDown:   flag('topdown'),
    isRightSide: flag('rightside'),
    noBttv:      flag('nobttv'),
    noFfz:       flag('noffz'),
    no7tv:       flag('no7tv'),
    debugMode:   flag('debug'),
  };
}
