define([
	'intern!tdd',
	'intern/chai!assert',
	'../../stores/Store'
], function (test, assert, Store) {
	test.suite('core/stores/Store', function () {
		test.test('basic', function () {
			var store = new Store();
			console.log(store);
		});
	});
});