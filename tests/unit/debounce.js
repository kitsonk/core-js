define([
	'intern!object',
	'intern/chai!assert',
	'../../debounce'
], function (registerSuite, assert, debounce) {
	registerSuite({
		name: 'core/debounce',
		'basic': function () {
			var dfd = this.async(1000),
				count = 0,
				now = Date.now(),
				fn = debounce(function () {
					count++;
					dfd.callback(function () {
						assert(Date.now() > (now + 250));	
					})();
				}, 250);

			for (var i = 1; i <= 30; i++) {
				setTimeout(function () {
					fn(i);
				}, i * 10);
			}
		}
	});
});