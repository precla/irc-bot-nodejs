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
