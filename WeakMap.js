define([
	'./has'
], function (has) {
	'use strict';

	/**
	 * This module provides an ability to create a "side table" where objects can be used as keys for values.  If there
	 * is native support for ES6 WeakMaps, those will be used, but if there is no WeakMap support then similar support
	 * is provided in ES5.  It is impossible to fully polyfill/shim the functionality of WeakMap in ES5, therefore
	 * this module doesn't attempt to.
	 *
	 * This is directly inspired by the SideTable functionality provided in Google's 
	 * [Polymer/mdv](https://github.com/Polymer/mdv/blob/stable/src/template_element.js)
	 */

	has.add('es6-weak-map', typeof WeakMap !== 'undefined');

	if (!has('es6-weak-map')) {
		var WeakMap,
			defineProperty = Object.defineProperty,
			uid = Date.now() % 1e9;

		WeakMap = function WeakMap() {
			/* Assign a GUID */
			this.name = '__st' + (1e9 * Math.random() >>> 0) + (uid++ + '__');
		};

		WeakMap.prototype = {
			set: function (key, value) {
				var entry = key[this.name];
				if (entry && entry[0] === key) {
					entry[1] = value;
				}
				else {
					defineProperty(key, this.name, {
						value: [key, value],
						writable: true
					});
				}
				return value;
			},
			get: function (key) {
				var entry = key[this.name];
				return entry && entry[0] === key ? entry[1] : undefined;
			},
			has: function (key) {
				var entry = key[this.name];
				return Boolean(entry && entry[0] === key);
			},
			'delete': function (key) {
				this.set(key, undefined);
			}
		};
	}

	return WeakMap;
});