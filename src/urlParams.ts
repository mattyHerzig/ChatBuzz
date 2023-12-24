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
  let minRepeatCount  = 3;        // min
  let repeatDuration  = 7.0;      // dur
  let windowWidth     = 800;      // width
  let windowHeight    = 600;      // height
  let ttsVolume       = 0.5;      // vol
  let ttsRate         = 0.8;      // rate
  let ttsPitch        = 2.0;      // pitch
  let noTts           = false;    // notts
  let bigEmotes       = false;    // bigemotes
  let isTopDown       = false;    // topdown
  let isRightSide     = false;    // rightside
  let noBttv          = false;    // noBttv
  let noFfz           = false;    // noFfz
  let no7tv           = false;    // no7tv
  let debugMode       = false;    // debug

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

  const windowWidthStr = urlParams.get('width');
  if (windowWidthStr) {
    const windowWidthParsed = parseInt(windowWidthStr);
    if (windowWidthParsed > 0) windowWidth = windowWidthParsed;
  }

  const windowHeightStr = urlParams.get('height');
  if (windowHeightStr) {
    const windowHeightParsed = parseInt(windowHeightStr);
    if (windowHeightParsed > 0) windowHeight = windowHeightParsed;
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

  noTts       = urlParams.has('notts')     && urlParams.get('notts')     !== 'false';
  bigEmotes   = urlParams.has('bigemotes') && urlParams.get('bigemotes') !== 'false';
  isTopDown   = urlParams.has('topdown')   && urlParams.get('topdown')   !== 'false';
  isRightSide = urlParams.has('rightside') && urlParams.get('rightside') !== 'false';
  noBttv      = urlParams.has('nobttv')    && urlParams.get('nobttv')    !== 'false';
  noFfz       = urlParams.has('noffz')     && urlParams.get('noffz')     !== 'false';
  no7tv       = urlParams.has('no7tv')     && urlParams.get('no7tv')     !== 'false';
  debugMode   = urlParams.has('debug')     && urlParams.get('debug')     !== 'false';

  return {
    channel,
    color,
    fontSize,
    minRepeatCount,
    repeatDuration,
    windowWidth,
    windowHeight,
    ttsVolume,
    ttsRate,
    ttsPitch,
    noTts,
    bigEmotes,
    isTopDown,
    isRightSide,
    noBttv,
    noFfz,
    no7tv,
    debugMode,
  };
}
