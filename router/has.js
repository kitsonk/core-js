define([
	'../has'
], function (has) {
	'use strict';

	has.add('html5-history', function (global) {
		return !!(global.window && global.window.history && 'pushState' in global.window.history);
	});

	has.add('html4-hashchange', function (global) {
		return 'onhashchange' in global;
	});

	return has;
});