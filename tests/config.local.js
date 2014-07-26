define([
	'./config'
], function (config) {
	config.tunnel = 'NullTunnel';
	config.tunnelOptions = {
		hostname: 'localhost',
		port: 4444
	};

	config.enviornments = [
		{ browserName: 'firefox' },
		{ browserName: 'chrome' }
	];

	return config;
});