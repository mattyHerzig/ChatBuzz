# ChatBuzz ![](./assets/favicon/favicon-32x32.png)
ChatBuzz is a simple OBS Plugin that displays repeated messages from a Twitch or YouTube chat.

## Setup & Demo (click)
[![Setup & Demo Video](https://img.youtube.com/vi/h4NHr8qFQfI/0.jpg)](https://youtu.be/h4NHr8qFQfI "ChatBuzz Setup & Demo")

## Table of Contents
* [Setup & Demo (click)](#setup--demo-click)
* [URL Parameters](#url-parameters)
  * [Table of Parameters](#table-of-parameters)
* [About](#about)
  * [Learnings](#learnings)

## URL Parameters
I've configured ChatBuzz so that its width and height are the same as the OBS Browser Source's default, 800x600. Because of this, it's as simple as putting in the URL and clicking "OK".

Your OBS Browser Source URL should look like "https://chatbuzz.app/?channel=CHANNEL", with CHANNEL being replaced by your Twitch channel's username (case insensitive). For YouTube, use "https://chatbuzz.app/?yt=@HANDLE" instead, with @HANDLE being your channel's handle or its "UC..." channel ID. Either way the URL stays the same from stream to stream. In addition, you can also add how ever many arguments to the end as you need, in any order, in the form '&PARAMETER=ARGUMENT'. For example, you may have "https://chatbuzz.app/?channel=xqc&notts&min=5&dur=10.5&color=red".

### Table of Parameters
| Parameter  | Definition                                                                                                                                    | Data Type | Constraints                                                | Default Value |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------------|-----------|------------------------------------------------------------|---------------|
| channel    | Twitch channel username                                                                                                                       | string    | -                                                          | -             |
| yt         | YouTube channel handle or ID e.g. "@LofiGirl" or "UCSJ4gkVC6NrvII8umztf0Ow". Use instead of channel; waits and connects on its own if you aren't live yet | string    | -                                                          | -             |
| ignore     | Usernames to ignore entirely, comma separated e.g. "nightbot,streamelements". Their messages don't count towards repeats at all (case insensitive)   | string    | -                                                          | -             |
| color      | Repeat font color                                                                                                                             | string    | pink \| red \| orange \| yellow \| green \| blue \| purple | yellow        |
| fontsize   | Repeat font size                                                                                                                              | float     | > 0.0                                                      | 30.0          |
| emotescale | Emote scale when compared to font size                                                                                                        | float     | > 0.0                                                      | 1.3           |
| min        | Minimum number of identical messages required to display it. Text-To-Speech also activates when the repeat count is a multiple of this number | int       | >= 1                                                       | 2             |
| dur        | Duration (in seconds) until a repeat expires without new identical messages                                                                   | float     | > 0.0                                                      | 7.0           |
| width      | Window width                                                                                                                                  | int       | > 0                                                        | 800           |
| height     | Window height                                                                                                                                 | int       | > 0                                                        | 600           |
| voice      | Text-To-Speech voice (case insensitive)                                                                                                       | string    | Brian \| Amy \| Joanna \| Salli \| Ricardo                   | Brian         |
| vol        | Text-To-Speech volume                                                                                                                         | float     | clamped to 0.0-1.0                                         | 0.5           |
| rate       | Text-To-Speech playback rate                                                                                                                  | float     | clamped to 0.25-4.0                                        | 1.0           |
| nocase     | Ignore capitalisation when matching repeats, so "LOL" and "lol" count together. The first spelling seen is the one shown | bool*     | -                                                          | false         |
| notts      | No Text-To-Speech                                                                                                                             | bool*     | -                                                          | false         |
| norepeat   | No Text-To-Speech repeating messages after the initial displaying                                                                             | bool*     | -                                                          | false         |
| topdown    | Top-down instead of bottom-up                                                                                                                 | bool*     | -                                                          | false         |
| rightside  | Right-side instead of left-side                                                                                                               | bool*     | -                                                          | false         |
| nobttv     | Exclude BetterTTV emotes                                                                                                                      | bool*     | -                                                          | false         |
| noffz      | Exclude FrankerFaceZ emotes                                                                                                                   | bool*     | -                                                          | false         |
| no7tv      | Exclude 7TV emotes                                                                                                                            | bool*     | -                                                          | false         |
| debug      | Debug mode                                                                                                                                    | bool*     | -                                                          | false         |

Text-To-Speech audio is served by StreamElements, so it needs an internet connection. If you get no speech, check the voice name first.

On Twitch, `ignore` matches the account's permanent username. YouTube has no equivalent, so there it matches the display name shown in chat, which anyone can change — treat it as best effort.

YouTube chat comes through a small Cloudflare Worker (`worker/`), because YouTube, unlike Twitch, doesn't let a browser read live chat directly. Nothing to set up to use it.

\* the bool paremeters, nocase–7tv, may be false on default, but I've made it so you don't need to provide "true" for it to be true. Simply include it as an argument e.g. "&topdown&notts" rather than "&topdown=true&notts=true".

## About
ChatBuzz is the first personal project that I can be genuinely be proud of. The need to create it came about when I wanted to personally use an OBS Plugin with a certain functionality while streaming on Twitch, but I couldn't find any that fit my needs. Specifically, the Twitch streamer Charborg has a similar program that was developed by Cagelight, seen [here](https://www.youtube.com/watch?v=pFehqYehbUA). I took it upon myself to make a free, open-source, public version.

(There exists a similar, widespread OBS Plugin concept of the "Combo" which is the number of consecutive identical messages. This is differentiated as a "Repeat", and uses a time duration which ignores whether or not messages are consecutive.)

I appreciate any and all feedback! Have you encountered any issues? Do you want new features e.g. emote-only mode, different font options? Any recommendations? Etc. Thanks for reading!

### Learnings
- TypeScript (& JavaScript)
- HTML
- CSS
- APIs ([tmi.js](https://github.com/tmijs/tmi.js), [teklynk_api_public](https://github.com/teklynk/twitch_api_public), YouTube live chat, [StreamElements](https://streamelements.com/) TTS)
- Webpack (later swapped for esbuild)
- Node.js
- Cloudflare Workers
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
