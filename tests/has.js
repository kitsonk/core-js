define([
	'intern!tdd',
	'intern/chai!assert',
	'../has'
], function (test, assert, has) {
	test.suite('core/has', function () {
		test.test('it exists', function () {
			assert(has);
			assert(typeof has === 'function');
		});
	});
});