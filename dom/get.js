define([
	'../doc'
], function (doc) {
	'use strict';

	return function get(id) {
		return ((typeof id === 'string') ? ((this && this.doc) || doc).getElementById(id) : id) || null;
	};
});