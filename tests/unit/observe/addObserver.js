define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/addObserver',
	'../../../observe/has'
], function (registerSuite, assert, addObserver, has) {

	if (has('es7-object-observe')) {
		registerSuite({
			name: 'core/observe/addObserver',
			'offloading': function () {
				assert.strictEqual(Object.observe, addObserver);
			}
		});
	}
	else {
		var noop = function () {};

		registerSuite({
			name: 'core/observe/addObserver',
			'basic': function () {
				var obj = {};
				assert.isFunction(addObserver);
				assert.strictEqual(addObserver(obj, noop), obj);
			},
			'isFrozen': function () {
				var fn = function () {},
					obj = {};
				Object.freeze(fn);
				assert.throws(function () {
					addObserver(obj, fn);
				}, TypeError);
			},
			'not function': function () {
				var obj = {};
				assert.throws(function () {
					addObserver(obj, {});
				}, TypeError);
			},
			'invalid accept': function () {
				assert.throws(function () {
					addObserver({}, function () {}, 'accept');
				}, TypeError);
			}
		});
	}
});