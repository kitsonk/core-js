define([
], function () {
	'use strict';

	return function throttle(callback, delay, binding) {
		var last,
			handle;
		
		return function () {
			binding = binding || this;
			var now = Date.now(),
				args = arguments;

			if (last && now < last + delay) {
				clearTimeout(handle);
				handle = setTimeout(function () {
					last = now;
					callback.apply(binding, args);
				}, delay);
			}
			else {
				last = now;
				callback.apply(binding, args);
			}
		};
	};

});