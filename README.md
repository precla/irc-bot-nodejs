[![Repo Size](https://reposs.herokuapp.com/?path=precla/irc-bot-nodejs)](https://github.com/precla/irc-bot-nodejs/archive/master.zip)
[![Build Status](https://img.shields.io/travis/precla/irc-bot-nodejs/master.svg)](https://travis-ci.org/precla/irc-bot-nodejs)
[![Dependency Status](https://img.shields.io/david/precla/irc-bot-nodejs.svg)](https://david-dm.org/precla/irc-bot-nodejs#info=dependencies&view=table)
[![devDependency Status](https://img.shields.io/david/dev/precla/irc-bot-nodejs.svg)](https://david-dm.org/precla/irc-bot-nodejs#info=devDependencies&view=table)
[![License](https://img.shields.io/badge/license-GPLv3-blue.svg)](http://opensource.org/licenses/GPL-3.0)

# irc-bot-nodejs

irc-bot-nodejs is a simple IRC bot with basic functionalities

## Usage
1. install Node.js and then do `npm i`
2. change `SERVER`, `BOTNAME`, `YOURCHAN`, `port`, `API_KEY` (for openweather), `PASSWORD` (for ident on NickServ)
3. run with: `node bot.js` or `npm run start`
4. while in an IRC channel type any of the supported commands

## Commands:
- `!wp <Article>` - get summary from Wikipedia for article. Example: `!wp Microsoft`.
- `!weather [zip] <City>` - get weather info for city. The `zip` argument is not required.  
	Example: `!weather Zagreb` or `!weather 10000,hr` will show the weather for Zagreb.
- `!tv`, `!next`, `!last <showname>` - Example: `!next Suits` - gets info about the next *Suits* episode.
- `!isup` - checks if a specified site is up. Example: `!isup www.github.com`

### To-do:
- add more? ofc!
- reconnect after disconnecting from irc

### Done:
- Weather command
- TVRage
- Isup to check if site is up
- Imgur URL parser
- NickServ identify
- Youtube URL parser

### License:
- GNU GPL v3
