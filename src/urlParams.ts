export const colorToRgb: Record<string, string> = {
  'pink'  : 'rgb(228, 81, 228)',
  'red'   : 'rgb(228, 81, 81)' ,
  'orange': 'rgb(228, 140, 81)',
  'yellow': 'rgb(226, 226, 66)',
  'green' : 'rgb(81, 228, 98)' ,
  'blue'  : 'rgb(98, 81, 228)' ,
  'purple': 'rgb(98, 81, 228)' ,
};

export function getURLParams() {
    
  // Initialize parameters as default values
  let channel: string | null;     // channel
  let color           = 'yellow'; // color
  let fontSize        = 30.0;     // fontsize
  let emoteSize       = 2;        // emotesize 
  let minRepeatCount  = 3;        // min
  let repeatDuration  = 7.0;      // dur
  let ttsVolume       = 0.5;      // vol
  let ttsRate         = 0.8;      // rate
  let ttsPitch        = 2.0;      // pitch
  let isNoTts         = false;    // notts
  let isTopDown       = false;    // topdown
  let isRightSide     = false;    // rightside
  let bttvIncluded    = false;    // bttv
  let ffzIncluded     = false;    // ffz
  let seventvIncluded = false;    // 7tv

  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);

  channel = urlParams.get('channel');
  if (channel) channel = channel.toLowerCase();

  const colorStr = urlParams.get('color');
  if (colorStr) {
    if (colorStr in colorToRgb) color = colorStr;
  }

  const fontSizeStr = urlParams.get('fontsize');
  if (fontSizeStr) {
    const fontSizeParsed = parseFloat(fontSizeStr);
    if (!isNaN(fontSizeParsed) && fontSizeParsed > 0) fontSize = fontSizeParsed;
  }

  const emoteSizeStr = urlParams.get('emotesize');
  if (emoteSizeStr) {
    const emoteSizeParsed = parseInt(emoteSizeStr);
    if (emoteSizeParsed >= 1 && emoteSizeParsed <= 3) emoteSize = emoteSizeParsed;
  }

  const minRepeatCountStr = urlParams.get('min');
  if (minRepeatCountStr) {
    const minRepeatCountParsed = parseInt(minRepeatCountStr);
    if (minRepeatCountParsed >= 2) minRepeatCount = minRepeatCountParsed;
  }

  const repeatDurationStr = urlParams.get('dur');
  if (repeatDurationStr) {
    const repeatDurationParsed = parseFloat(repeatDurationStr);
    if (!isNaN(repeatDurationParsed) && repeatDurationParsed > 0) repeatDuration = repeatDurationParsed;
  }

  const ttsVolumeStr = urlParams.get('vol');
  if (ttsVolumeStr) {
    const ttsVolParsed = parseFloat(ttsVolumeStr);
    if (!isNaN(ttsVolParsed) && ttsVolParsed >= 0) ttsVolume = ttsVolParsed;
  }

  const ttsRateStr = urlParams.get('rate');
  if (ttsRateStr) {
    const ttsRateParsed = parseFloat(ttsRateStr);
    if (!isNaN(ttsRateParsed) && ttsRateParsed > 0) ttsRate = ttsRateParsed;
  }

  const ttsPitchStr = urlParams.get('pitch');
  if (ttsPitchStr) {
    const ttsPitchParsed = parseFloat(ttsPitchStr);
    if (!isNaN(ttsPitchParsed)) ttsPitch = ttsPitchParsed;
  }

  isNoTts = urlParams.has('notts');

  isTopDown = urlParams.has('topdown');

  isRightSide = urlParams.has('rightside');

  if (urlParams.has('all')) {
    bttvIncluded = true;
    ffzIncluded = true;
    seventvIncluded = true;
  } else {
    bttvIncluded = urlParams.has('bttv');
    ffzIncluded = urlParams.has('ffz');
    seventvIncluded = urlParams.has('7tv');
  }

  return {
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
  };
}
