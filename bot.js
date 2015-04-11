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

	// bot config
var bot = new irc.Client('SERVER', 'BOTNAME', {
	port: 7000,
	debug: true,
	secure: true,
	selfSigned: true,
	autoConnect: true,
	channels: ['#YOURCHAN']
});

bot.addListener('message', function(nick, to, text, message) {
	// removes ' ' and converts into array
	var args = text.split(' ');

	if (args[0] == '!wp') {
        if (!args[1]) {
            bot.say(to, 'Missing arguments. Usage example: !wp NodeJS');
        } else {
            args.shift();                                           //removes first arg and moves others by -1
            var args = args.join(' ');                              //adds ' ' between every elemnt of array and saves as string
            var titleSecondTry = args;                              //save a copy for later use - if string has to be capitalized: martin scorsese -> Martin Scorsese
            var title = querystring.stringify({ titles: args });    //add titles= before string
            var wiki = 'https://en.wikipedia.org/w/api.php?continue=&action=query&' + title + '&indexpageids=&prop=extracts&exintro=&explaintext=&format=json';

            request(wiki, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var wikiSummary = JSON.parse(body);
                    var pageId = wikiSummary.query.pageids[0];      //get pageID
                    
                    //if pageId is -1 than the article does not exist
                    if (pageId == -1) {
                        
                        //Try again with changing first letter of every word to upper case
                        titleSecondTry = titleSecondTry.replace(/[^\s]+/g, function (word) {
                            return word.replace(/^./, function (first) {
                                return first.toUpperCase();
                            });
                        });

                        titleSecondTry = querystring.stringify({ titles: titleSecondTry });

                        wiki = 'https://en.wikipedia.org/w/api.php?continue=&action=query&' + titleSecondTry + '&indexpageids=&prop=extracts&exintro=&explaintext=&format=json';
                        request(wiki, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                wikiSummary = JSON.parse(body);
                                pageId = wikiSummary.query.pageids[0];
                                if (pageId == -1) {
                                    bot.say(to, 'Article does not exist or could not be found. Sorry :C');
                                } else {
                                    wikiSummary = wikiSummary.query.pages[pageId].extract;
                                    wikiSummary = wikiSummary.slice(0, 280);
                                    checkRedirect = wikiSummary.slice(0, 70);
                                    if (checkRedirect == 'This is a redirect from a title with another method of capitalisation.') {
                                        bot.say(to, 'Article is redirecting, please use the following link: https://en.wikipedia.org/wiki/' + titleSecondTry.slice(7));
                                    } else {
                                        wikiSummary = wikiSummary.concat('... Read more: ' + 'https://en.wikipedia.org/wiki/' + titleSecondTry.slice(7));
                                        bot.say(to, wikiSummary);
                                    }
                                }
                            }
                        });
                    } else {
                        wikiSummary = wikiSummary.query.pages[pageId].extract;
                        wikiSummary = wikiSummary.slice(0, 280);
                        var checkRedirect = wikiSummary.slice(0, 70);
                        if (checkRedirect == 'This is a redirect from a title with another method of capitalisation.') {
                            bot.say(to, 'Article is redirecting, please use the following link: https://en.wikipedia.org/wiki/' + title.slice(7));
                        } else {
                            wikiSummary = wikiSummary.concat('... Read more: ' + 'https://en.wikipedia.org/wiki/' + title.slice(7));
                            bot.say(to, wikiSummary);
                        }
                    }
                }
            });
        }
    } else if (args[0] == '!weather') {
        if (!args[1]) {
            bot.say(to, 'Missing arguments. Usage example: !weather Moscow');
        } else {
            var apiKey = '';
        }
    }
});

bot.addListener('error', function(message) {
	console.log('error: ', message);
});
