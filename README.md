# irc-bot-nodejs
irc-bot-nodejs is a simple IRC bot with basic functionalities

## Usage
1. install Node.js (irc, request & querystring are required)
2. change SERVER, BOTNAME, YOURCHAN & port
3. run with: 'node bot.js'
4. while in irc channel type anyo f the supported commands

## Commands:
- !wp <Article> - get sumamry from Wikipedia for Article. Example: !wp Microsoft
- !weather [zip] <City> - get weather info for city. The argument [zip] is not requiered
	example: '!weather Zagreb' - OR - '!weather 10000,hr' will show weather for Zagreb
- !tv, !next, !last <showname> - for example: '!next Suits' - gets info about next episode

### To do:
-add more?

### Done:
- Weather command
- TvRage

### License:
- GNU GPL v3
