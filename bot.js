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

'use strict';

var irc = require('irc'),
	request = require('request'),
	querystring = require('querystring'),
	moment = require('moment'),
	TVRage = require('tvragejson'),
	_ = require('lodash'),
	cheerio = require('cheerio'),
	c = require('irc-colors');

// bot config
var bot = new irc.Client('SERVER', 'BOTNAME', {
	port: 7000,
	debug: true,
	secure: true,
	selfSigned: true,
	autoConnect: true,
	userNick: 'BOTNICK',
	userName: 'BOTNAME',
	realName: 'BOTNAME',
	adminNick: 'ADMIN-NICK',
	channels: ['#YOURCHAN'],
	showErrors: true,
	floodProtectionDelay: 1000,
	messageSplit: 512
});

// listen for pm
bot.addListener('pm', function(nick) {
	bot.say(nick, 'Type !help for a list of commands');
});

bot.addListener('notice', function (nick, to, text, message) {
	if (message.args[1].match(/This nickname is registered and protected/g) !== null) {
		bot.say('NickServ', 'identify PASSWORD');
	}
	if (message.args[1].match(/Password accepted - you are now recognized./g) !== null) {
		bot.join(bot.opt.channels.join(','));
	}
});

bot.addListener('message', function(nick, to, text) {
	// removes ' ' and converts into array
	var args = text.split(' ');

	if (args[0] === '!wp') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !wp NodeJS');
		} else {
			args.shift();                                           // removes first arg and moves others by -1
			args = args.join(' ');                                  // adds ' ' between every element of array and saves as string
			var titleSecondTry = args;                              // save a copy for later use - if string has to be capitalized: martin scorsese -> Martin Scorsese
			var title = querystring.stringify({ titles: args });    // add titles= before string
			var wiki = 'https://en.wikipedia.org/w/api.php?continue=&action=query&' + title + '&indexpageids=&prop=extracts&exintro=&explaintext=&format=json';

			request(wiki, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					var wikiSummary = JSON.parse(body);
					var pageId = wikiSummary.query.pageids[0];      // get pageID

					// if pageId is -1 then the article does not exist
					if (pageId === '-1') {

						// Try again with changing first letter of every word to upper case
						titleSecondTry = titleSecondTry.replace(/[^\s]+/g, function (word) {
							return word.replace(/^./, function (first) {
								return first.toUpperCase();
							});
						});

						titleSecondTry = querystring.stringify({ titles: titleSecondTry });

						wiki = 'https://en.wikipedia.org/w/api.php?continue=&action=query&' + titleSecondTry + '&indexpageids=&prop=extracts&exintro=&explaintext=&format=json';
						request(wiki, function (err, res, bod) {
							if (!err && res.statusCode === 200) {
								wikiSummary = JSON.parse(bod);
								pageId = wikiSummary.query.pageids[0];
								if (pageId === '-1') {
									bot.say(to, 'Article does not exist or could not be found. Sorry :C');
								} else {
									wikiSummary = wikiSummary.query.pages[pageId].extract;
									wikiSummary = wikiSummary.slice(0, 280);
									var checkRedirect = wikiSummary.slice(0, 70);
									if (checkRedirect === 'This is a redirect from a title with another method of capitalisation.') {
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
						if (checkRedirect === 'This is a redirect from a title with another method of capitalisation.') {
							bot.say(to, 'Article is redirecting, please use the following link: https://en.wikipedia.org/wiki/' + title.slice(7));
						} else {
							wikiSummary = wikiSummary.concat('... Read more: ' + 'https://en.wikipedia.org/wiki/' + title.slice(7));
							bot.say(to, wikiSummary);
						}
					}
				}
			});
		}
	} else if (args[0] === '!weather') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !weather Moscow; !weather zip 10000,hr');
		} else {
			var currentWeather = 'http://api.openweathermap.org/data/2.5/weather?';
			var metric = '&units=metric';
			var apiKey = '&APPID=API_KEY';
			var userInput;
			args.shift();

			// check if user wants to search by ZIP code or by city name
			if (args[0] === 'zip') {
				userInput = 'zip=' + args[1];
			} else {
				args = args.join('');
				userInput = 'q=' + args;
			}
			userInput += metric + apiKey;
			var openweatherLink = currentWeather + userInput;

			request(openweatherLink, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					var openweatherJson = JSON.parse(body);
					if (openweatherJson.cod === 404) {
						console.error('error while trying to get weather, "cod" code: ', openweatherJson.cod);
						bot.say(to, 'Not found.');
					} else if (openweatherJson.cod === 200) {
						// sunrise & sunset are currently not in use, uncomment if you want to use:
						// var sunrise = new Date(openweatherJson.sys.sunrise * 1000);
						// var sunset = new Date(openweatherJson.sys.sunset * 1000);

						var openweatherSummary = 'The current temperature in ' + openweatherJson.name +
												', ' + openweatherJson.sys.country + ' is: ' + openweatherJson.main.temp.toFixed(1) +
												' C, ' + openweatherJson.weather[0].description + '. Pressure: ' + openweatherJson.main.pressure +
												' hpa. Wind speed: ' + openweatherJson.wind.speed + ' m/s (' + (openweatherJson.wind.speed * 3.6).toFixed(2) + ' km/h).';

						bot.say(to, openweatherSummary);
					} else {
						console.error('error while trying to get weather for: ', openweatherLink);
					}
				}
			});
		}
	} else if (args[0] === '!tv' || args[0] === '!next' || args[0] === '!last') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !tv Suits; !next Top Gear; !last The Simpsons');
		} else {
			var argInput = args[0];
			args.shift();
			args = args.join(' ');
			TVRage.search(args, function (err, response) {
				if (!err && response['Results'] !== '0') {
					var showID, showSummary, showSummaryShort, tvShowLink, nextEp, lastEp, genres, airtimeOfEp;

					// TVRage sometimes responds with multiple shows which are saved into array
					// the following request is required, otherwise the bot would crash if it doesn't get a array
					if (_.isArray(response['Results']['show'])) {
						showID = parseInt(response['Results']['show'][0]['showid'], 10);
					} else {
						showID = parseInt(response['Results']['show']['showid'], 10);
					}

					TVRage.fullShowInfo(showID, function (err, response) {
						if (!err) {
							tvShowLink = response['Show']['showlink'];
							airtimeOfEp = response['Show']['airtime'];

							// if more than one genre, do join
							if (response['Show']['genres']['genre'] >= 2) {
								genres = response['Show']['genres']['genre'].join(', ');
							} else {
								genres = response['Show']['genres']['genre'];
							}

							showSummary = 'TVrage info: ' + response['Show']['name'] + ' (' + response['Show']['origin_country'] + ') | Genre: ' +
										genres + ' | Status: ' + response['Show']['status'] +
										' | Launch date: ' + response['Show']['started'];
							showSummaryShort = 'TVrage info: ' + response['Show']['name'] + ' (' + response['Show']['origin_country'] + ')';

							var userInput = querystring.stringify({ show: args });
							var tvrageLink = 'http://services.tvrage.com/tools/quickinfo.php?' + userInput;
							request(tvrageLink, function (error, response, body) {
								if (!error && response.statusCode === 200) {

									var tvrageContent = body;
									var currentTime, duration;

									// get info for the next episode, but before that, check
									// if the show has ended or been cancelled, then there is no upcoming episode
									if (tvrageContent.indexOf('Status@Ended') >= '0') {
										nextEp = tvrageContent.slice(tvrageContent.indexOf('Status@') + 7, tvrageContent.indexOf('Classification@') - 1) + '. No more episodes';
									} else if (tvrageContent.indexOf('Next Episode@') <= '0') {
										nextEp = 'No info about upcoming episodes.';
									} else {
										// the next line is required to get SxxExx later on
										nextEp = tvrageContent.slice(tvrageContent.indexOf('Next Episode@') + 13, tvrageContent.indexOf('RFC3339@') - 1);

										// get passed time from last episode
										var unixTime = parseInt(tvrageContent.slice(tvrageContent.indexOf('NODST@') + 6, tvrageContent.indexOf('Country@') - 1) * 1000, 10);
										var timeOfNextEp = moment.utc(unixTime);														// time from TVRage, next episode
										currentTime = moment.utc();																		// current time in UTC format
										duration = moment.duration(currentTime - timeOfNextEp, 'milliseconds');

										var timeUntilNext = timeOfNextEp.diff(currentTime, 'days') + ' days ' + (duration.hours() * -1) + ' hours ' +
														(duration.minutes() * -1) + ' mins (' + moment.utc(unixTime).format('DD-MM-YYYY HH:mm') + ' UTC)';

										nextEp = 'Next Episode is in ' + timeUntilNext + ' | Number: S' + nextEp.slice(0, 2) + nextEp.slice(2, 5).replace('x', 'E') +
											' | Title: ' + nextEp.slice(nextEp.indexOf('^') + 1, nextEp.lastIndexOf('^'));
									}

									// get info for the latest episode but before that, check
									// if there is any info about the latest episode
									if (tvrageContent.indexOf('Latest Episode@') <= '0') {
										lastEp = 'No info about last episode.';
									} else {
										lastEp = tvrageContent.slice(tvrageContent.indexOf('Latest Episode@') + 15, tvrageContent.lastIndexOf('Next Episode@'));

										// get passed time from the last episode
										var timeOfLastEp = moment.utc(lastEp.slice(-12, -1) + airtimeOfEp, 'MMM-DD-YYYY HH:mm');		// time from TVRage, last episode
										currentTime = moment.utc();																	// current time in UTC format
										duration = moment.duration(currentTime - timeOfLastEp, 'milliseconds');

										var timeFromLast = currentTime.diff(timeOfLastEp, 'days') + ' days ' + duration.hours() + ' hours ' + duration.minutes() + ' mins ';

										lastEp = 'Latest Episode was ' + timeFromLast + ' ago (' + moment.utc(timeOfLastEp).format('DD-MM-YYYY HH:mm') +
											' UTC)' + ' | Number: S' + lastEp.slice(0, 2) + lastEp.slice(2, 5).replace('x', 'E') +
											' | Title: ' + lastEp.slice(lastEp.indexOf('^') + 1, lastEp.lastIndexOf('^'));
									}

									if (argInput === '!tv') {
										showSummary = showSummary + ' | ' + lastEp;
									} else if (argInput === '!next') {
										showSummary = showSummaryShort + ' | ' + nextEp + ' | ' + tvShowLink;
									} else if (argInput === '!last') {
										showSummary = showSummaryShort + ' | ' + lastEp + ' | ' + tvShowLink;
									}
									bot.say(to, showSummary);
								}
							});
						} else {
							console.error(err);
							bot.say(to, 'Error while trying to get show info, sorry :C');
						}
					});
				} else {
					console.error(err);
					bot.say(to, 'Not found. Try harder!');
				}
			});
		}
	} else if (args[0] === '!isup') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !isup imdb.com , !isup www.imdb.com ');
		} else {
			args.shift();
			// if there's 'http(s)://' remove it
			var urlToCheck = args[0].replace(/(http:|https:)\/\//g, '');

			// some sites like google.com don't get checked properly without 'www.'
			// so it checks if users has included 'www.' in link, if not add 'www.'
			if (!urlToCheck.match(/(www\.)/g)) {
				urlToCheck = 'www.' + urlToCheck;
			}
			// before request, check if URL is OK, for example: www.example.123 would not allow request
			if (urlToCheck.match(/(www\.)\w+(\.)[a-zA-Z]/g)) {
				request('http://www.isup.me/' + urlToCheck, function (error, response, body) {
					if (!error && response.statusCode === 200) {
						if (body.match(/It\'s just you/g)) {
							bot.say(to, 'Site is up!');
						} else if (body.match(/Huh\?/g)) {
							bot.say(to, 'Sorry pal, that URL does not seem to be correct..');
						} else {
							bot.say(to, 'Site is down!');
						}
					}
				});
			} else {
				bot.say(to, 'Sorry pal, that URL does not seem to be correct..');
			}
		}
	} else if (text.match(/https?(:\/\/)(i\.imgur.com|imgur.com)\/(gallery\/)?(\w{3,})\/?(.\w{3})?(\W\d)?/gi)) {
		var preImageID = text.match(/https?(:\/\/)(i\.imgur.com|imgur.com)(\/r)?\/(\w{0,}\/)?/g);
		var imageID = text.slice(preImageID[0].length);

		// Remove any extension (*.jpg, *.png,...)
		if (imageID.match(/\./g)) {
			imageID = imageID.slice(0, imageID.indexOf('.'));
		}

		var requestURL = 'https://imgur.com/' + imageID;
		request(requestURL, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				if (!error && response.statusCode === 200) {
					var $ = cheerio.load(body);
					var imageTitle = $('title').text().trim();
					bot.say(to, c.bold('Imgur: ') + imageTitle);
				}
			}
		});
	} else if (args[0] === '!help') {
		bot.say(nick, 'Commands available:\n!wp - Wikipedia summary\n!weather - current weather\n!tv, !next, !last - for TV show info\!help');
	}

});

bot.addListener('error', function(message) {
	console.error('error: ', message);
});
