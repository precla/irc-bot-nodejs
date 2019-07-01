[![Repo Size](https://reposs.herokuapp.com/?path=precla/irc-bot-nodejs)](https://github.com/precla/irc-bot-nodejs/archive/master.zip)
[![Build Status](https://img.shields.io/travis/precla/irc-bot-nodejs/master.svg)](https://travis-ci.org/precla/irc-bot-nodejs)
[![Dependency Status](https://img.shields.io/david/precla/irc-bot-nodejs.svg)](https://david-dm.org/precla/irc-bot-nodejs#info=dependencies&view=table)
[![devDependency Status](https://img.shields.io/david/dev/precla/irc-bot-nodejs.svg)](https://david-dm.org/precla/irc-bot-nodejs#info=devDependencies&view=table)
[![License](https://img.shields.io/badge/license-GPLv3-blue.svg)](http://opensource.org/licenses/GPL-3.0)

# irc-bot-nodejs

irc-bot-nodejs is a simple IRC bot with basic functionalities

## Usage
1. install Node.js and then do `npm i`
2. change settings in config.example.js and save as config.js
3. run with: `node bot.js` or `npm run start`
4. while in an IRC channel type any of the supported commands

## Commands:
- `!wp <Article>` - get summary from Wikipedia for article. Example: `!wp Microsoft`.
- `!weather [zip] <City>` - get weather info for city. The `zip` argument is not required.  
	Example: `!weather Zagreb` or `!weather 10000,hr` will show the weather for Zagreb.
	same for `!wf` (or `!weatherforecast`) - outputs weather forecast for the next 5 days
- `!tv`, `!next`, `!last <showname>` - Example: `!next Suits` - gets info about the next *Suits* episode.
- `!isup` - checks if a specified site is up. Example: `!isup www.github.com`
- `!csgo` - get player info for the game Counter-Strike: Global Offensive
- `!g`, `!google` - search via google and show first result
- `!remind` - set a reminder. Example: `!remind 16:30 Grab a beer`. Limitation: only time allowed, no date.

### To-do:
- add more? ofc!
- reconnect after disconnecting from irc (until then, use: [foreverjs/forever](https://github.com/foreverjs/forever) ) 

### Done:
- Weather command - current weather or forecast
- TVRage
- Isup to check if site is up
- NickServ identify
- Separate config file for easier bot configuration & usage
- URL parser for: Github, SoundCloud, Twitter, Youtube, Imgur
- Counter-Strike: Global Offensive player info

### License:
- GNU GPL v3
