define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/removeObserver',
	'../../../observe/has',
	'../../../observe/addObserver',
	'../../../observe/has!es7-object-observe?:../../../observe/properties'
], function (registerSuite, assert, removeObserver, has, addObserver, observableProperties) {

	if (has('es7-object-observe')) {
		registerSuite({
			name: 'core/observe/removeObserver',
			'offloading': function () {
				assert.strictEqual(Object.unobserve, removeObserver);
			}
		});
	}
	else {
		var getNotifier = observableProperties.getNotifier;

		registerSuite({
			name: 'core/observe/removeObserver',
			'basic': function () {
				var obj = {},
					observer = function () {};
				
				assert.isFunction(removeObserver);
				addObserver(obj, observer);
				var observers = getNotifier(obj).observers;
				assert.isTrue(!!~observers.indexOf(observer));
				assert.strictEqual(removeObserver(obj, observer), obj);
				assert.isFalse(!!~observers.indexOf(observer));
				removeObserver(obj, observer);
				removeObserver(obj, function () {});
			},
			'isFunction': function () {
				var obj = {},
					observer = [];

				assert.throws(function () {
					removeObserver(obj, observer);
				}, TypeError);
			}
		});
	}
});