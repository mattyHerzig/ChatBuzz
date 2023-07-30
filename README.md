# ChatBuzz ![](favicon/favicon-32x32.png)
ChatBuzz is a simple OBS Plugin that displays repeated messages from a Twitch chat.

## Setup & Demo (click)
[![Setup & Demo Video](https://img.youtube.com/vi/H00uMktz4qo/0.jpg)](https://youtu.be/H00uMktz4qo "ChatBuzz Setup & Demo")

## Table of Contents
* [Setup & Demo (click)](#setup--demo-click)
* [URL Arguments](#url-arguments)
  * [Table of Handled Arguments](#table-of-handled-arguments)
* [About the Project](#about-the-project)
  * [Learnings](#learnings)
* [Future Features (if Warranted)](#future-features-if-warranted)
* [Contributing](#contributing)
* [License](#license)

## URL Arguments
Your OBS Browser Source URL should look like 'https://chatbuzz.app/?user=USERNAME', with USERNAME being replaced by your Twitch channel's username (case insensitive).

In addition, you can also add how ever many arguments to the end as you need, in any order, in the form '&ARG=PARAMETER'. For example, you may have 'https://chatbuzz.app/?user=xqc&tts=false&min=5&dur=10.5'

### Table of Handled Arguments
| Argument | Definition                                                           | Data Type | Constraints                  | Default Value |
|----------|----------------------------------------------------------------------|-----------|------------------------------|---------------|
| min      | Minimum number of identical messages required to display it          | number    | Integer greater than or equal to 2 | 2             |
| dur      | Duration of time (in seconds) that defines a repeat                  | number    | Greater than 0.0                   | 7.0           |
| tts      | Text-To-Speech                                                       | bool      | None                               | true          |
| vol      | Volume                                                               | number    | Greater than or equal to 0.0       | 1.0           |

## About the Project
ChatBuzz is the first personal project that I can be genuinely be proud of. The need to create it came about when I wanted to personally use OBS Plugin with its certain functionality while streaming on Twitch, but I couldn't find an open-source, public version. In addition, I thought it would be good practice.

(There exists a similar, widespread OBS Plugin concept of the "Combo". However, this is differentiated from a "Repeat", in that it checks when consecutive messages are identical, whereas, for a Repeat, I used a time duration which ignores whether or not a message is consecutive.)

Its development involved many, many things that I've never used before (see [Learnings](#learnings) below for more details). 

I also wanna highlight how, in addition to simply using basic logic and concepts, I created original, purposeful, and useful processes. In particular, I'm fond of how I handled repeats by making them a JavaScript interface with meaningful values store within them (such as their own childNode and timeout value), how I handled active repeats with an array of repeat interfaces, how I utilized the custom restartTimeout function, how I used childNodes for the displayed messages to conveniently place and remove them in the HTML, and how my logic in the message handler replicated my initial vision for the project, with animations and all.

It took more time and energy than I'm willing to admit, but I'd guess that's the standard for one's first project of this magnitude. All in all, I couldn't be happier with how it turned out! Something that a GitHub repo doesn't represent would be the experimentation behind these projects. Having to go through various web authentication processes, trying out different algorithms, etc. I suppose it's a part of making a project in general, but I went through so many variations of the project before settling. Also, I wasn't afraid to completely redesign the entire project. For example, one of my early versions involved the repeat interface storing its countdown as an integer, representing how many seconds it had left. Using this process, the project worked as intended. However, I felt like it wasn't optimized, and it wasn't elegant. That it could definitely be better. That's when I came up with the idea of simply using the timeout method described above.

I'm not afraid to admit that I used ChatGPT in many aspects of this project. There were few times where I was able to simply copy and paste the code it produced, and when I could, it was mostly simple concepts such as urlParams(), JavaScript Arrow Function notation (since it's my first time using it), etc. However, it was invaluable. Nowhere else could I imagine getting the personalized help that I did using it. For example, asking it how to handle error messages, about webpack, transpiling, etc. (I do wanna highlight that I never took its words at face value. I am aware of its tendency to "hallucinate", among other faults. I simply used it as a starting point, and double checked all of its claims)

I even drew the favicon myself (the image that is seen in the website tab) (if you're curious, I used Procreate with a 2nd gen Apple Pencil :D)! ![](favicon/favicon-32x32.png)

### Learnings
- TypeScript (JavaScript with enforced type syntax)
- HTML
- CSS
- Other Web Development e.g. getting a domain, hosting, favicon
- Node
- APIs (specifically, tmi.js)
- Webpack
- Unix shell
- VSCode (e.g. learning how to efficiently work, utilizing helpful extensions such as Live Preview)
- Git (through GitHub)
- Project Management
  - Ideation to Completion
  - Adhering to a \[personal\] need
  - Branding (name, logo)
  - UX (User Experience), in that I accounted for ease of use, meaningful and succinct error messages
    - In addition to proper CSS formatting according to my initial vision of the project, I also sought to optimize visibility according to a typical stream, aesthetic value, etc.
  - Research e.g. effective Google habits, helpful tools such as ChatGPT
  - Commenting (even though I'm the only one working on it, I enjoy doing it as well as making clean and elegant code)
  - I sought to optimize as much as I could e.g. I wasn't afraid to completely redesign the project if I deemed another process better
  - Publicization
    - Documentation
      - Markdown e.g. this (`README.md`)
    - Making a demo video ([Setup & Demo (click)](#setup--demo-click))
    - Publishing to obsproject.com [here](https://obsproject.com/forum/resources/chatbuzz.1757/)

## Future Features (if Warranted)
- CSS customization (change the formatting and styling)
- Display emotes
  - Animated
  - Channel-exclusive
  - 7tv, FrankerfaceZ, BetterTTV
- Figure out how to allow OBS to handle audio (currently, it doesn't work with SpeechSynthesisUtterance's, so you have to simply uncheck that Browser Source box and hear the noise)
- Different voices
- Works for other platforms e.g. YouTube
- Create alternative combo version

## Contributing
Any contributions are greatly appreciated.
1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License
Distributed under the MIT License, see `LICENSE` for more info.

## <sub><sub><sub><sup>Give a ⭐️ :)</sup></sub></sub></sub>
