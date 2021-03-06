#!/usr/bin/env node

/*
* (C) 2018 precla
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
	irc = require('irc-upd'),
	moment = require('moment'),
	numeral = require('numeral'),
	ontime = require('ontime'),
	querystring = require('querystring'),
	request = require('request'),
	youtube = require('youtube-api'),
	_ = require('lodash'),
	google = require('google');

require('moment-countdown');
require('moment-duration-format');

// Useful functions we'll use

var zeroPad = function (number) {
	return (number < 10) ? ('0' + number) : number;
};
var nanToZero = function (number) {
	return isNaN(number) ? 0 : number;
};

// bot configuration
var bot = new irc.Client(config.server, config.userNick, {
	port: config.port,
	debug: config.debug,
	secure: config.secure,
	selfSigned: config.selfSigned,
	certExpired: config.certExpired,
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
			args.shift();
			args = args.join(' ');
			var titleSecondTry = args;	// save a copy for later use - if string has to be capitalized: martin scorsese -> Martin Scorsese
			var title = querystring.stringify({ titles: args });
			var wiki = 'https://en.wikipedia.org/w/api.php?continue=&action=query&' + title + '&indexpageids=&prop=extracts&exintro=&explaintext=&format=json';

			request(wiki, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					var wikiSummary = JSON.parse(body);
					var pageId = wikiSummary.query.pageids[0];	// get pageID

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
	} else if (args[0] === '!google' || args[0] === '!g') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !g Terry Pratchett');
		} else {
			args.shift();
			args = args.join(' ');
			google(args, function (err, res) {
				if (err) {
					console.error(err);
				}
				bot.say(to, res.links[0].title + ' | ' + res.links[0].description + ' | ' + res.links[0].href);
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
					if (openweatherJson.cod === '404') {
						console.error('error while trying to get weather, "cod" code: ', openweatherJson.cod);
						bot.say(to, 'Sorry, no weather info for that one.');
					} else if (openweatherJson.cod === 200) {

						var openweatherSummary = 'The current temperature in ' + openweatherJson.name +
												', ' + openweatherJson.sys.country + ' is: ' + openweatherJson.main.temp.toFixed(1) +
												' C, ' + openweatherJson.weather[0].description +
												'. Pressure: ' + openweatherJson.main.pressure +
												' hpa. Wind speed: ' + openweatherJson.wind.speed + ' m/s (' + (openweatherJson.wind.speed * 3.6).toFixed(2) +
												' km/h). Humidity: ' + openweatherJson.main.humidity +
												' %. Local Time: ' + moment.unix(parseInt(moment().format('X'), 10) + parseInt(openweatherJson.timezone, 10)).format('dddd, MMMM Do YYYY, HH:mm:ss') +
												' h. Sunrise: ' + moment.unix(openweatherJson.sys.sunrise + parseInt(openweatherJson.timezone, 10)).format('HH:mm:ss') +
												' h, sunset: ' + moment.unix(openweatherJson.sys.sunset + parseInt(openweatherJson.timezone, 10)).format('HH:mm:ss') + ' h.';

						bot.say(to, openweatherSummary);
					} else {
						console.error('error while trying to get weather for: ', openweatherLink);
						bot.say(to, 'Sorry, no weather info for that one.');
					}
				}
			});
		}
	} else if (args[0] === '!wf' || args[0] === '!weatherforecast') {
		if (!args[1]) {
			bot.say(to, 'Missing arguments. Usage example: !weather Moscow; !weather zip 10000,hr');
		} else {
			var forecastWeather = 'http://api.openweathermap.org/data/2.5/forecast?';
			var metricAndMode = '&units=metric&mode=json';
			var apiKeyOW = '&APPID=' + config.OWapiKey;
			var userQuery;
			args.shift();

			// check if user wants to search by ZIP code or by city name
			if (args[0] === 'zip') {
				userQuery = 'zip=' + args[1];
			} else {
				args = args.join('');
				userQuery = 'q=' + args;
			}
			userQuery += metricAndMode + apiKeyOW;
			var owLink = forecastWeather + userQuery;

			request(owLink, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					var openweatherJson = JSON.parse(body);
					if (openweatherJson.cod === '404') {
						console.error('error while trying to get weather, "cod" code: ', openweatherJson.cod);
						bot.say(to, 'Sorry, no weather info for that one.');
					} else if (openweatherJson.cod === '200') {
						var i = 0;
						for (i = 0; i < openweatherJson.cnt; i++) {
							if (openweatherJson.list[i].dt_txt.search('15:00:00') >= 0) {
								break;
							}
						}

						var openweatherSummary = '';

						for (i; i < openweatherJson.cnt; i += 8) {
							var day = moment(openweatherJson.list[i].dt_txt);
							openweatherSummary += moment().day(day.day()).format('dddd') + ': ' + openweatherJson.list[i].main.temp +
												' C, ' + openweatherJson.list[i].weather[0].description +
												', ' + openweatherJson.list[i].main.pressure +
												' hpa, ' + openweatherJson.list[i].wind.speed +
												' km/h, ' + openweatherJson.list[i].main.humidity + ' % \n';
						}

						bot.say(to, openweatherSummary);
					} else {
						console.error('error while trying to get weather forecast for: ', owLink);
						bot.say(to, 'Sorry, no weather forecast info for that one.');
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
			var TVMazeAPI = 'http://api.tvmaze.com/singlesearch/shows?q=' + args + '&embed[]=previousepisode&embed[]=nextepisode';

			request(TVMazeAPI, function(error, response, body) {
				var showSummary;
				if (!error && response.statusCode === 200) {
					body = JSON.parse(body);
					var showName = body.name,
						showUrl = body.url,
						showGenre = 'Genre: ' + body.genres.join(', '),
						showStatus = 'Status: ' + body.status,
						showStartDate = 'Premiered: ' + body.premiered,
						showLastEpInfo,
						showNextEpInfo,
						showLastEpAired, showLastEpAgo, showLastSeasonNum, showLastEpNum, showLastEp, showLastEpName,
						showNextEp, showNextEpName, showNextEpAir;

					if (body._embedded.previousepisode) {
						showLastEpAired = body._embedded.previousepisode.airstamp;
						showLastEpAgo = 'Last episode aired: ' + moment(showLastEpAired).countdown().toString() + ' ago';
						showLastSeasonNum = body._embedded.previousepisode.season;
						showLastEpNum = body._embedded.previousepisode.number;
						showLastEp = 'Number: S' + zeroPad(showLastSeasonNum) + 'E' + zeroPad(showLastEpNum);
						showLastEpName = 'Title: ' + body._embedded.previousepisode.name;
						showLastEpInfo = showLastEpAgo + ' | ' + showLastEp + ' | ' + showLastEpName;
					} else {
						showLastEpInfo = 'No info about last episode';
					}

					if (body._embedded.nextepisode) {
						showNextEp = 'Number: S' + zeroPad(body._embedded.nextepisode.season) + 'E' + zeroPad(body._embedded.nextepisode.number);
						showNextEpName = 'Title: ' + body._embedded.nextepisode.name;
						showNextEpAir = body._embedded.nextepisode.airstamp;
						showNextEpInfo = 'Next episode is in ' + moment(showNextEpAir).countdown().toString() + ' | ' + showNextEp + ' | ' + showNextEpName;
					} else {
						if (body.status === 'Ended') {
							showNextEpInfo = 'Show has ended';
						} else {
							showNextEpInfo = 'No info about next episode';
						}
					}

					if (argInput === '!tv') {
						showSummary = 'TVMaze info: ' + showName + ' | ' + showGenre + ' | ' + showStatus +
									' | ' + showStartDate + ' | ' + showLastEpInfo + ' | ' + showUrl;
					} else if (argInput === '!next') {
						showSummary = 'TVMaze info: ' + showName + ' | ' + showNextEpInfo + ' | ' + showUrl;
					} else if (argInput === '!last') {
						showSummary = 'TVMaze info: ' + showName + ' | ' + showLastEpInfo + ' | ' + showUrl;
					}
					bot.say(to, showSummary);

				} else {
					bot.say(to, 'TVMaze: Couldn\'t parse data');
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
				request('https://downforeveryoneorjustme.com/' + urlToCheck, function (error, response, body) {
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
			part: 'snippet, contentDetails, statistics',
			id: ytID
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
				/*
				var ytSummaryOutput = nsfw + 'Youtube title: ' + c.bold(data.items[0].snippet.title) +
					' | Duration: ' + moment.duration(data.items[0].contentDetails.duration).format('hh:mm:ss', { trim: false }) +
					' | Like: ' + c.green(numeral(data.items[0].statistics.likeCount).format('0,0')) +
					' / Dislike: ' + c.red(numeral(data.items[0].statistics.dislikeCount).format('0,0')) +
					' | Views: ' + numeral(data.items[0].statistics.viewCount).format('0,0');
				*/

				var ytSummaryOutput = nsfw + c.bold('Youtube | ') + c.underline(data.items[0].snippet.title) +
					' by ' + c.bold(data.items[0].snippet.channelTitle) +
					c.bold(' | ') + moment.duration(data.items[0].contentDetails.duration).format('hh:mm:ss', { trim: false });

				bot.say(to, ytSummaryOutput);
			} else {
				bot.say(to, 'Something went wrong while trying to get information about that Youtube video, call CSI to zoom-enhance & investigate.');
			}
		});
	} else if (text.match(/https?:\/\/twitter.com\/\w*(\/status\/\d*)?/gi)) {
		var twitterURL = text.match(/https?:\/\/twitter.com\/\w*(\/status\/\d*)?/gi);
		request(twitterURL[0], function (error, response, body) {
			if (!error && response.statusCode === 200) {
				var $ = cheerio.load(body);
				var twitterTitle = $('title').text().trim();
				twitterTitle = twitterTitle.split(':');
				var twitterTitleText = twitterTitle[1].split('http')[0].substring(2);
				bot.say(to, 'Twitter' + c.bold(' | ' + twitterTitle[0].split(' on Twitter')[0] + ' | ') + twitterTitleText);
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
	} else if (args[0] === '!csgo') {
		var API = 'http://api.steampowered.com';
		var appid = '?key=' + config.steam;
		var chanoutput;
		if (!args[1]) {
			bot.say(to, 'You have to supply an user name in order to see some stats.');
		} else {
			request({
				uri: API + '/ISteamUser/ResolveVanityURL/v0001/' + appid + '&vanityurl=' + args[1],
				json: true
			}, function(error, response, body) {
				var uSteamID;
				if (body.response.success === 1) {
					uSteamID = body.response.steamid;
				} else {
					if (args[1].match(/\d{17}/)) {
						uSteamID = args[1];
					}
				}

				request({
					uri: API + '/ISteamUserStats/GetUserStatsForGame/v0002/' + appid + '&appid=730&steamid=' + uSteamID,
					json: true
				}, function(error, response, body) {
					if (!error && response.statusCode === 200) {
						if (_.isEmpty(body) !== true) {
							var getStats = {};
							body.playerstats.stats.forEach(function (el) {
								getStats[el.name] = el.value;
							});
							var kills = getStats['total_kills'];
							var deaths = getStats['total_deaths'];
							var KDR = nanToZero((kills / deaths).toFixed(2));
							var playTime = moment.duration(getStats['total_time_played'], 'seconds').format('h [hrs] m [min]');
							var hits = getStats['total_shots_hit'];
							var shots = getStats['total_shots_fired'];
							var accuracy = nanToZero(((hits / shots) * 100).toFixed(2));
							var headShots = getStats['total_kills_headshot'];
							var headShotsPerc = nanToZero(((headShots / kills) * 100).toFixed(2));
							var MVP = getStats['total_mvps'];
							var battles = getStats['total_rounds_played'];
							var wins = getStats['total_wins'];
							var winRate = nanToZero(((wins / battles) * 100).toFixed(2));

							request({
								uri: API + '/ISteamUser/GetPlayerSummaries/v0002/' + appid + '&appid=730&steamids=' + uSteamID,
								json: true
							}, function(error, response, body) {
								var userName = body.response.players[0].personaname;
								chanoutput = '[' + c.bold(userName) + '] Played: ' + playTime + ' | Battles: ' +
									battles + ' [won: ' + wins + ' (' + winRate + '%) | Accuracy: ' + accuracy +
									'% | K/D: ' + KDR + ' [kills: ' + kills + ' - HeadShots: ' + headShots +
									' (' + headShotsPerc + '%)] | MVP: ' + MVP;
								bot.say(to, chanoutput);
							});
						} else {
							chanoutput = 'Maybe ' + c.bold(args[1]) + ' hasn\'t played CS:GO yet, or this profile is not public.';
						}
					} else {
						chanoutput = 'Something went wrong on the API server. Status code: ' + response.statusCode;
					}
					bot.say(to, chanoutput);
				});
				bot.say(to, chanoutput);
			});
		}
	} else if (args[0] === '!help') {
		bot.say(nick, 'Commands available:\n!wp - Wikipedia summary\n!weather or !w - current weather\n' +
						'!tv, !next, !last - for TV show info\n!isup - check if a website is up\n' +
						'!csgo - CSGO Profile statistic\n!help\n' +
						'\nBot grabs titles for the following links posted in the channel:\n' +
						'imgur, youtube, twitter, github, soundcloud');
	} else if (args[0] === '!remind') {
		if (!args[1] || !args[2]) {
			bot.say(to, 'Missing TIME and TEXT. For example: !remind 14:30 Check pizza in oven');
		} else {
			var timeToRemind = args[1];
			var currentdate = new Date();
			var currMinutes = currentdate.getMinutes();
			if (currMinutes < 10) {
				currMinutes = '0' + currMinutes;
			}
			var currentTime = currentdate.getHours() + ':' + currMinutes;
			if (timeToRemind < currentTime) {
				bot.say(to, 'Current time: ' + currentTime +
						' is earlier then your set time, reminder is set for tomorrow.');
			}
			args.splice(0, 2);
			ontime({
				cycle: timeToRemind + ':00'
			}, function (ot) {
				bot.say(to, 'Hey ' + nick + ' , don\'t forget: ' + args.join(' '));
				ot.done();
				ot.cancel();
				return;
			});
			bot.say(to, 'Reminder set for ' + nick + '. At ' + timeToRemind + ' with: ' + args.join(' '));
		}
	}

});

bot.addListener('error', function(message) {
	console.error('error: ', message);
});
