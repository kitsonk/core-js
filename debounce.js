define([
], function () {
	'use strict';

	return function debounce(callback, delay, binding) {
		var timer;
		return function () {
			binding = binding || this;
			var args = arguments;

			clearTimeout(timer);
			timer = setTimeout(function () {
				callback.apply(binding, args);
			}, delay);
		};
	};
});