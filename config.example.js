// Create the configuration
module.exports = {
	server: 'SERVER',
	port: 7000,
	secure: true,
	selfSigned: true,	// accept self signed certificate
	certExpired: true,	// accept expired certificate
	autoConnect: true,
	userNick: 'BOTNICK',
	userName: 'BOTNAME',
	realName: 'BOTNAME',
	adminNick: 'ADMIN-NICK',
	channels: ['#YOURCHAN'],
	debug: true,
	showErrors: true,
	floodProtectionDelay: 1000,
	messageSplit: 512,

	// NickServ Password:
	nickservPassword: '',
	// Youtube Key
	youtubeKey: '',
	// Openweather API key:
	OWapiKey: '',
	// SoundCloud
	soundCloudClientID: '',
	// Steam dev key https://steamcommunity.com/dev
	steam: ''
};
