#!/usr/bin/env node

/*
* (C) 2015 precla
*
* This file is part of irc-bot-nodejs.
*
* irc-bot-nodejs is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 3 of the License, or
* (at your option) any later version.
*
* irc-bot-nodejs is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program. If not, see <http://www.gnu.org/licenses/>.
*
*/

var irc = require('irc'),
	request = require('request'),
	querystring = require('querystring');

//bot config
var bot = new irc.Client('SERVER', 'BOTNAME', {
	port: 7000,
    debug: true,
	secure: true,
	selfSigned: true,
    autoConnect: true,
	channels: ['#YOURCHAN'],
});

bot.addListener('message', function(nick, to, text, message) {
	var args = text.split(' ');				//removes ' ' and converts into array
		
	if( args[0] == '!wp' && !args[1] ){
		bot.say(to, 'Missing arguments. Usage example: !wp NodeJS');
	} else if (args[0] == '!wp') {		
		args.shift();						//removes first element in array
		var args = args.join(' ');			//joins array into new string with ' ' between strings
		var title = querystring.stringify({ titles: args });
		var wiki = 'https://en.wikipedia.org/w/api.php?continue=&action=query&' + title + '&indexpageids=&prop=extracts&exintro=&explaintext=&format=json';
		
		request(wiki, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var wikiSummary = JSON.parse(body);
				var pageId = wikiSummary.query.pageids[0];
				wikiSummary = wikiSummary.query.pages[pageId].extract;
				wikiSummary = wikiSummary.slice(0, 240);
				wikiSummary = wikiSummary.concat("... Read more: " + "https://en.wikipedia.org/wiki/" + title.slice(7) );
				bot.say(to, wikiSummary );
			}
		})
    }
});

bot.addListener('error', function(message) {
    console.log('error: ', message);
});