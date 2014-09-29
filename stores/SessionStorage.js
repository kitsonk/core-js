define([
	'../compose',
	'../global',
	'./_Storage'
], function (compose, global, _Storage) {
	'use strict';

	var sessionStorage = global.window && global.window.sessionStorage;
	
	return compose(_Storage, {
		storage: sessionStorage
	});
});