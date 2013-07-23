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

	has.add('es6-weak-map', 'undefined' !== typeof WeakMap && navigator.userAgent.indexOf('Firefox/') < 0);

	var SideTable;
	if (has('es6-weak-map')) {
		SideTable = WeakMap;
	}
	else {
		var defineProperty = Object.defineProperty,
			hasOwnProperty = Object.hasOwnProperty,
			uid = new Date().getTime() % 1e9;

		SideTable = function SideTable() {
			/* Assign a GUID */
			this.name = '__st' + (1e9 * Math.random() >>> 0) + (uid++ + '__');
		};

		SideTable.prototype = {
			set: function (key, value) {
				defineProperty(key, this.name, {
					value: value,
					writable: true
				});
			},
			get: function (key) {
				return hasOwnProperty.call(key, this.name) ? key[this.name] : void 0;
			},
			'delete': function (key) {
				this.set(key, void 0);
			}
		};
	}

	return SideTable;
});