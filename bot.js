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
	querystring = require('querystring'),
	moment = require('moment');

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
			args.shift();                                           // removes first arg and moves others by -1
			var args = args.join(' ');                              // adds ' ' between every elemnt of array and saves as string
			var titleSecondTry = args;                              // save a copy for later use - if string has to be capitalized: martin scorsese -> Martin Scorsese
			var title = querystring.stringify({ titles: args });    // add titles= before string
			var wiki = 'https://en.wikipedia.org/w/api.php?continue=&action=query&' + title + '&indexpageids=&prop=extracts&exintro=&explaintext=&format=json';

			request(wiki, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var wikiSummary = JSON.parse(body);
					var pageId = wikiSummary.query.pageids[0];      // get pageID

					// if pageId is -1 than the article does not exist
					if (pageId == -1) {

						// Try again with changing first letter of every word to upper case
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
			bot.say(to, 'Missing arguments. Usage example: !weather Moscow; !weather zip 10000,hr');
		} else {
			var currentWeather = 'http://api.openweathermap.org/data/2.5/weather?';
			var metric = '&units=metric';
			var apiKey = '&APPID=API_KEY';
			var userInput;
			args.shift();

			// check if user wants to search by ZIP code or by city name
			if (args[0] == 'zip') {
				var userInput = 'zip=' + args[1];
			} else {
				args = args.join('');
				var userInput = 'q=' + args;
			}
			userInput += metric + apiKey;
			var openweatherLink = currentWeather + userInput;

			request(openweatherLink, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var openweatherJson = JSON.parse(body);
					if (openweatherJson.cod == 404) {
						console.log('error while trying to get weather, "cod" code: ', openweatherJson.cod);
						bot.say(to, 'Not found.');
					} else if (openweatherJson.cod == '200') {
						var sunrise = new Date(openweatherJson.sys.sunrise * 1000);
						var sunset = new Date(openweatherJson.sys.sunset * 1000);

						var openweatherSummary = 'The current temperature in ' + openweatherJson.name +
												', ' + openweatherJson.sys.country + ' is: ' + openweatherJson.main.temp.toFixed(1) +
												' C, ' + openweatherJson.weather[0].description + '. Pressure: ' + openweatherJson.main.pressure +
												' hpa. Wind speed: ' + openweatherJson.wind.speed + ' m/s (' + (openweatherJson.wind.speed * 3.6).toFixed(2) + ' km/h).';

						bot.say(to, openweatherSummary);
					} else {
						console.log('error while trying to get weather for: ', openweatherLink);
					}
				}
			});
		}
	} else if (args[0] == '!tv' || args[0] == '!next' || args[0] == '!last') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !tv Suits; !next Top Gear; !last The Simpsons');
		} else {
			var argInput = args[0];
			args.shift();
			var args = args.join(' ');
			var userInput = querystring.stringify({ show: args });
			var tvrageLink = 'http://services.tvrage.com/tools/quickinfo.php?' + userInput;

			request(tvrageLink, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var tvrageContent = body;
					var checkIfExists = tvrageContent.slice(0, 7);
					if (checkIfExists == 'No Show') {
						bot.say(to, 'Not found. Try harder!');
					} else {
						var tvTitle = tvrageContent.slice(tvrageContent.indexOf('Name@') + 5, tvrageContent.indexOf('Show URL@') - 1);
						var tvURL = tvrageContent.slice(tvrageContent.indexOf('URL@') + 4, tvrageContent.indexOf('Premiered@') - 1);
						var nextEp;
						var lastEp;

						// if show ended or cancelled, than there is no upcoming episode
						if (tvrageContent.indexOf('Status@Ended') >= '0' || tvrageContent.indexOf('Status@Ended') >= '0') {
							nextEp = tvrageContent.slice(tvrageContent.indexOf('Status@') + 7, tvrageContent.indexOf('Classification@') - 1) + '. No more episodes';
						} else {
							nextEp = tvrageContent.slice(tvrageContent.indexOf('Next Episode@') + 13, tvrageContent.indexOf('RFC3339@') - 1);

							// get remaining time until next episode
							var timeOfNextEp = new Date(tvrageContent.slice(tvrageContent.indexOf('NODST@') + 6, tvrageContent.indexOf('Country@') - 1) * 1000);
							var duration = moment.duration((timeOfNextEp - moment()), 'milliseconds');
							duration = moment.duration(duration.asSeconds() - 1, 'seconds');

							var timeUntilNext = duration.days() + ' days ' + duration.hours() + ' hours ' + duration.minutes() + ' mins ' + duration.seconds() + ' secs';

							nextEp = 'Next Episode: in ' + timeUntilNext + ' | Number: S' + nextEp.slice(0, 2) + nextEp.slice(2, 5).replace('x', 'E') +
									' | Title: ' + nextEp.slice(nextEp.indexOf('^') + 1, nextEp.lastIndexOf('^'));
						}

						// get info for latest episode
						lastEp = tvrageContent.slice(tvrageContent.indexOf('Latest Episode@') + 15, tvrageContent.lastIndexOf('Next Episode@'));

						// get passed time from last episode
						var timeOfLastEp = moment(lastEp.slice(-12, -1, 'MMM-DD-YYYY'));				// time from tvrage, last episode
						var currentTime = moment();														// current time
						var duration = moment.duration(currentTime - timeOfLastEp, 'milliseconds');

						var timeFromLast = currentTime.diff(timeOfLastEp, 'days') + ' days ' + duration.hours() + ' hours ' + duration.minutes() + ' mins ' + duration.seconds() + ' secs';

						lastEp = 'Latest Episode was ' + timeFromLast + ' ago | Number: S' + lastEp.slice(0, 2) + lastEp.slice(2, 5).replace('x', 'E') +
									' | Title: ' + lastEp.slice(lastEp.indexOf('^') + 1, lastEp.lastIndexOf('^'));

						var tvrageContentSummary = tvTitle + ' | ';
						if (argInput == '!tv') {
							tvrageContentSummary = tvrageContentSummary + lastEp + ' | ' + tvURL;
						} else if (argInput == '!next') {
							tvrageContentSummary = tvrageContentSummary + nextEp;
						} else {
							// !last
							tvrageContentSummary = tvrageContentSummary + lastEp;
						}

						bot.say(to, tvrageContentSummary);
					}
				}
			});
		}
	}

});

bot.addListener('error', function(message) {
	console.log('error: ', message);
});
