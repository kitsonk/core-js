define([
	'../has'
], function (has) {
	'use strict';

	has.add('storage-local', function (global) {
		return global.window && global.window.localStorage;
	});

	has.add('storage-session', function (global) {
		return global.window && global.window.sessionStorage;
	});

	has.add('storage-indexeddb', function (global) {
		var win = global.window;
		return win ? win.indexedDB || win.mozIndexedDB || win.webkitIndexedDB || win.msIndexedDB : false;
	});

	return has;
});