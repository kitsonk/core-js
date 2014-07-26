define([
	'./config'
], function (config) {
	config.excludeInstrumentation = /^.*/;

	return config;
});