# ChatBuzz ![](./assets/favicon/favicon-32x32.png)
ChatBuzz is a simple OBS Plugin that displays repeated messages from a Twitch chat.

## Setup & Demo (click)
[![Setup & Demo Video](https://img.youtube.com/vi/h4NHr8qFQfI/0.jpg)](https://youtu.be/h4NHr8qFQfI "ChatBuzz Setup & Demo")

## Table of Contents
* [Setup & Demo (click)](#setup--demo-click)
* [URL Parameters](#url-parameters)
  * [Table of Parameters](#table-of-parameters)
  * [Text-To-Speech Bug](#text-to-speech-bug)
* [About](#about)
  * [Learnings](#learnings)

## URL Parameters
I've configured ChatBuzz so that its width and height are the same as the OBS Browser Source's default, 800x600. Because of this, it's as simple as putting in the URL and clicking "OK".

Your OBS Browser Source URL should look like 'https://chatbuzz.app/?channel=CHANNEL', with CHANNEL being replaced by your Twitch channel's username (case insensitive). In addition, you can also add how ever many arguments to the end as you need, in any order, in the form '&PARAMETER=ARGUMENT'. For example, you may have "https://chatbuzz.app/?channel=xqc&notts&min=5&dur=10.5&color=red".

### Table of Parameters
| Parameter  | Definition                                                                                                                                    | Data Type | Constraints                                                | Default Value |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------------|-----------|------------------------------------------------------------|---------------|
| channel    | Channel username                                                                                                                              | string    | -                                                          | -             |
| color      | Repeat font color                                                                                                                             | string    | pink \| red \| orange \| yellow \| green \| blue \| purple | yellow        |
| fontsize   | Repeat font size                                                                                                                              | float     | > 0.0                                                      | 30.0          |
| emotescale | Emote scale when compared to font size                                                                                                        | float     | > 0.0                                                      | 1.3           |
| min        | Minimum number of identical messages required to display it. Text-To-Speech also activates when the repeat count is a multiple of this number | int       | >= 2                                                       | 3             |
| dur        | Duration (in seconds) until a repeat expires without new identical messages                                                                   | float     | > 0.0                                                      | 7.0           |
| width      | Window width                                                                                                                                  | int       | > 0                                                        | 800           |
| height     | Window height                                                                                                                                 | int       | > 0                                                        | 600           |
| vol        | Text-To-Speech volume                                                                                                                         | float     | >= 0.0                                                     | 0.5           |
| rate       | Text-To-Speech rate                                                                                                                           | float     | > 0.0                                                      | 0.8           |
| pitch      | Text-To-Speech pitch                                                                                                                          | float     | -                                                          | 2.0           |
| notts      | No Text-To-Speech                                                                                                                             | bool*     | -                                                          | false         |
| norepeat   | No Text-To-Speech repeating messages after the initial displaying                                                                             | bool*     | -                                                          | false         |
| topdown    | Top-down instead of bottom-up                                                                                                                 | bool*     | -                                                          | false         |
| rightside  | Right-side instead of left-side                                                                                                               | bool*     | -                                                          | false         |
| nobttv     | Exclude BetterTTV emotes                                                                                                                      | bool*     | -                                                          | false         |
| noffz      | Exclude FrankerFaceZ emotes                                                                                                                   | bool*     | -                                                          | false         |
| no7tv      | Exclude 7TV emotes                                                                                                                            | bool*     | -                                                          | false         |
| debug      | Debug mode                                                                                                                                    | bool*     | -                                                          | false         |

\* the bool paremeters, notts–7tv, may be false on default, but I've made it so you don't need to provide "true" for it to be true. Simply include it as an argument e.g. "&topdown&notts" rather than "&topdown=true&notts=true".

### Text-To-Speech Bug
The voice synthesis used by most web browsers, SpeechSynthesis, has issues with OBS as seen [here](https://github.com/obsproject/obs-browser/issues/404). Because of this, you have to uncheck the browser source property box "Control audio via OBS" to hear the audio, and unfortunately the audio might play when you're in other scenes. The current workaround is to temporarily add the notts parameter or to delete the ChatBuzz browser source when needed. In the future, I may explore different TTS processes such as an API or a local program.

## About
ChatBuzz is the first personal project that I can be genuinely be proud of. The need to create it came about when I wanted to personally use an OBS Plugin with a certain functionality while streaming on Twitch, but I couldn't find any that fit my needs. Specifically, the Twitch streamer Charborg has a similar program that was developed by Cagelight, seen [here](https://www.youtube.com/watch?v=pFehqYehbUA). I took it upon myself to make a free, open-source, public version.

(There exists a similar, widespread OBS Plugin concept of the "Combo". However, this is differentiated from a "Repeat", in that it checks when consecutive messages are identical, whereas, for a Repeat, I used a time duration which ignores whether or not a message is consecutive.)

I appreciate any and all feedback! Have you encountered any issues? Do you want new features e.g. emote-only mode, different font options? Any recommendations? Etc. Thanks for reading!

### Learnings
- TypeScript (& JavaScript)
- HTML
- CSS
- APIs ([tmi.js](https://github.com/tmijs/tmi.js), [teklynk_api_public](https://github.com/teklynk/twitch_api_public))
- Webpack
- Node.js
- General Web Development e.g. domain, hosting, favicon
- Git
- Unix shell
- VS Code
- UX (User Experience)
- Project Management
- Documentation
  - Markdown e.g. this (`README.md`)
- Making a demo video ([Setup & Demo (click)](#setup--demo-click))
- Published to obsproject.com [here](https://obsproject.com/forum/resources/chatbuzz.1757/)
