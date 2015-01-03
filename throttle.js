define([
], function () {

	var throttle = function throttle(callback, delay, binding, trailing) {
		var last,
			handle;
		
		return function () {
			binding = binding || this;
			var now = Date.now(),
				args = Array.prototype.slice.call(arguments);

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

	return throttle;
});