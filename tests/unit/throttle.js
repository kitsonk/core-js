define([
	'intern!object',
	'intern/chai!assert',
	'../../throttle'
], function (registerSuite, assert, throttle) {
	registerSuite({
		name: 'core/throttle',
		'basic': function () {
			var dfd = this.async(1000),
				count = 0,
				fn = throttle(function () {
					count++;
					if (count === 3) {
						dfd.callback(function () {
							assert.equal(count, 3);
						})();
					}
					else if (count > 3) {
						throw new Error('Too many calls');
					}
				}, 250);

			for (var i = 1; i <= 30; i++) {
				setTimeout(function () {
					fn(i);
				}, i * 10);
			}
		}
	});
});