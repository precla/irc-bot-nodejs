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

// Local libs and files

var config = require('./config'),

// node modules defined in package.json

	c = require('irc-colors'),
	cheerio = require('cheerio'),
	getYouTubeID = require('get-youtube-id'),
	irc = require('irc'),
	moment = require('moment'),
	numeral = require('numeral'),
	querystring = require('querystring'),
	request = require('request'),
	TVRage = require('tvragejson'),
	Twitter = require('twitter'),
	youtube = require('youtube-api'),
	_ = require('lodash');

require('moment-duration-format');

// bot configuration
var bot = new irc.Client(config.server, config.userNick, {
	port: config.port,
	debug: config.debug,
	secure: config.secure,
	selfSigned: config.selfSigned,
	autoConnect: config.autoConnect,
	userNick: config.userNick,
	userName: config.userName,
	realName: config.realName,
	adminNick: config.adminNick,
	channels: config.channels,
	showErrors: config.showErrors,
	floodProtectionDelay: config.floodProtectionDelay,
	messageSplit: config.messageSplit
});

// listen for pm
bot.addListener('pm', function(nick) {
	bot.say(nick, 'Type !help for a list of commands');
});

bot.addListener('notice', function (nick, to, text, message) {
	if (message.args[1].match(/This nickname is registered/g) !== null) {
		bot.say('NickServ', 'identify ' + config.nickservPassword);
	}
	if (message.args[1].match(/Password accepted - you are now recognized./g) !== null) {
		bot.join(bot.opt.channels.join(','));
	}
});

// Youtube authentication key
youtube.authenticate({type: 'key', key: config.youtubeKey});

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
	} else if (args[0] === '!weather' || args[0] === '!w') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !weather Moscow; !weather zip 10000,hr');
		} else {
			var currentWeather = 'http://api.openweathermap.org/data/2.5/weather?';
			var metric = '&units=metric';
			var apiKey = '&APPID=' + config.OWapiKey;
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
				if (!err && (response['Results'] !== '0')) {
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

							showSummary = 'TVRage info: ' + response['Show']['name'] + ' (' + response['Show']['origin_country'] + ') | Genre: ' +
											genres + ' | Status: ' + response['Show']['status'] +
											' | Launch date: ' + response['Show']['started'];
							showSummaryShort = 'TVRage info: ' + response['Show']['name'] + ' (' + response['Show']['origin_country'] + ')';

							var userInput = querystring.stringify({ show: args });
							var tvrageLink = 'http://services.tvrage.com/tools/quickinfo.php?' + userInput;
							request(tvrageLink, function (error, response, body) {
								if (!error && response.statusCode === 200) {

									var tvrageContent = body, currentTime, duration;

									// get info for the next episode, but before that, check
									// if the show has ended or been canceled, then there is no upcoming episode
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
										currentTime = moment.utc();																	// current time in UTC format
										duration = moment.duration(currentTime - timeOfNextEp, 'milliseconds');

										var timeUntilNext = timeOfNextEp.diff(currentTime, 'days') + ' days ' + (duration.hours() * (-1)) + ' hours ' +
															(duration.minutes() * (-1)) + ' mins (' + moment.utc(unixTime).format('DD-MM-YYYY HH:mm') + ' UTC)';

										if (tvrageContent.match(/TBA/gi)) {
											nextEp = 'Next episode: TBA' + ' | Number: S' + nextEp.slice(0, 2) + nextEp.slice(2, 5).replace('x', 'E') +
											' | Title: ' + nextEp.slice(nextEp.indexOf('^') + 1, nextEp.lastIndexOf('^'));
										} else {
											nextEp = 'Next Episode is in ' + timeUntilNext + ' | Number: S' + nextEp.slice(0, 2) + nextEp.slice(2, 5).replace('x', 'E') +
											' | Title: ' + nextEp.slice(nextEp.indexOf('^') + 1, nextEp.lastIndexOf('^'));
										}
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
						}
					});
				} else {
					console.log(err);
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
	} else if (text.match(/(http|https):\/\/(i\.imgur|imgur)\.(com\/gallery\/|com\/r\/(\S+)\/|com\/)(\S+)/g)) {
		var imgurR = /(?:http|https):\/\/(?:i\.imgur|imgur)\.(?:com\/gallery\/|com\/r\/(?:\S+)\/|com\/)(\S+)/g;

		var imageID = imgurR.exec(text)[1];
		imageID = /[^.]*/.exec(imageID)[0];

		var requestURL = 'https://imgur.com/gallery/' + imageID;
		request(requestURL, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				var $ = cheerio.load(body);
				var imageTitle = $('title').text().trim();
				if (imageTitle !== 'Imgur') {
					bot.say(to, c.bold('Imgur: ') + imageTitle.replace(' - Imgur', ''));
				}
			}
		});
	} else if (text.match(/(https?(:\/\/))?(www.)?youtu(be|.be)?(.com)?\/(watch\?v=)?(\S+)/gi)) {
		var ytID = getYouTubeID(text);

		youtube.videos.list({
			'part': 'snippet, contentDetails, statistics',
			'id': ytID
		}, function (error, data) {
			if (!error && data.items[0]) {
				var nsfw, contentRating = data.items[0].contentDetails.contentRating;
				if (contentRating) {
					if (contentRating.ytRating === 'ytAgeRestricted') {
						nsfw = c.bold.red.bgwhite('NSFW') + ' | ';
					} else {
						nsfw = '';
					}
				} else {
					nsfw = '';
				}
				var ytSummaryOutput = nsfw + 'Youtube title: ' + c.bold(data.items[0].snippet.title) +
					' | Duration: ' + moment.duration(data.items[0].contentDetails.duration).format('hh:mm:ss', { trim: false }) +
					' | Like: ' + c.green(numeral(data.items[0].statistics.likeCount).format('0,0')) +
					' / Dislike: ' + c.red(numeral(data.items[0].statistics.dislikeCount).format('0,0')) +
					' | Views: ' + numeral(data.items[0].statistics.viewCount).format('0,0');
				bot.say(to, ytSummaryOutput);
			} else {
				bot.say(to, 'Something went wrong while trying to get info about that Youtube video, call CSI to zoom-enchace & investigate.');
			}
		});
	} else if (text.match(/https?:\/\/twitter.com\/\w*(\/status\/\d*)?/gi)) {
		var twitterURL = text.match(/https?:\/\/twitter.com\/\w*(\/status\/\d*)?/gi);
		request(twitterURL[0], function (error, response, body) {
			if (!error && response.statusCode === 200) {
				var $ = cheerio.load(body);
				var twitterTitle = $('title').text().trim();
				bot.say(to, c.bold('Twitter: ') + twitterTitle);
			}
		});
	} else if (text.match(/https?:\/\/github.com\/\S*/gi)) {
		var githubURL = text.match(/https?:\/\/github.com\/\S*/gi);
		request(githubURL[0], function (error, response, body) {
			if (!error && response.statusCode === 200) {
				var $ = cheerio.load(body);
				var githubDescription = $('.repository-description').text().trim();
				var githubUserFullName = $('.vcard-fullname').text().trim();
				var githubUserNick = $('.vcard-username ').text().trim();
				var githubOrganisationName = $('.org-name').text().trim();

				if (githubDescription !== '') {
					bot.say(to, c.bold('GitHub: ') + githubDescription);
				} else if (githubUserFullName !== '' && githubUserNick !== '') {
					bot.say(to, c.bold('GitHub user: ') + githubUserFullName + ' (' + githubUserNick + ')');
				} else if (githubUserFullName === '' && githubUserNick !== '') {
					bot.say(to, c.bold('GitHub user: ') + githubUserNick);
				} else if (githubOrganisationName !== '') {
					bot.say(to, c.bold('GitHub organisation: ') + githubOrganisationName);
				}
			}
		});
	} else if (text.match(/http?s:\/\/(www.)?soundcloud.com\/([^\/]*)\/(\S*)/gi)) {
		var soundCloudLink = text.match(/http?s:\/\/(www.)?soundcloud.com\/([^\/]*)\/(.*)/gi);
		request({
				uri: soundCloudLink[0],
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0'
				}
			}, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					var soundCloudSongID = body.match(/soundcloud:\/\/sounds:\d*/i);
					soundCloudSongID = soundCloudSongID[0].match(/\d{6,}/g);

					if (soundCloudSongID[0]) {
						soundCloudLink = 'https://api.soundcloud.com/tracks/' + soundCloudSongID[0] + '.json?client_id=' + config.soundCloudClientID;
						request({
								uri: soundCloudLink,
								method: 'GET',
								headers: {
									'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0'
								}
							}, function (error, response, data) {
								if (!error && response.statusCode === 200) {
									data = JSON.parse(data);

									var soundCloudSummary = 'SoundCloud:' + c.bold(data.title) +
										' | Duration: ' + moment.duration(data.duration).format('hh:mm:ss', { trim: false }) +
										' | Likes: ' + c.green(numeral(data.favoritings_count).format('0,0')) +
										' | Played: ' + c.white(numeral(data.playback_count).format('0,0')) + ' times';
									bot.say(to, soundCloudSummary);
								}
							});
					}
				}
			});
	} else if (args[0] === '!help') {
		bot.say(nick, 'Commands available:\n!wp - Wikipedia summary\n!weather - current weather\n!tv, !next, !last - for TV show info\n!help');
	}

});

bot.addListener('error', function(message) {
	console.error('error: ', message);
});
