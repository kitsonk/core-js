define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/summary',
	'../../../observe/properties'
], function (registerSuite, assert, observeSummary, observableProperties) {

	var defineObservableProperty = observableProperties.defineObservableProperty,
		removeObservableProperty = observableProperties.removeObservableProperty;

	registerSuite({
		name: 'core/observe/summary',
		'basic': function () {
			var dfd = this.async(250);

			var obj = {
				foo: 'bar',
				baz: 1,
				qat: 4
			};

			var callback = dfd.callback(function (added, removed, changed, oldValueFn) {
				assert.strictEqual(2, Object.keys(changed).length);
				assert.strictEqual('qat', changed.foo);
				assert.strictEqual(2, changed.baz);
				assert.deepEqual({ 'bar': 'foo' }, added);
				assert.deepEqual({ 'qat': undefined }, removed);
				assert.strictEqual('bar', oldValueFn('foo'));
				assert.strictEqual(1, oldValueFn('baz'));
				assert.strictEqual(4, oldValueFn('qat'));
				assert.isUndefined(oldValueFn('bar'));
			});

			var handle = observeSummary(obj, callback);
			obj.foo = 'qat';
			obj.baz = 2;
			defineObservableProperty(obj, 'bar', {
				value: 'foo',
				writable: true,
				enumerable: true,
				configurable: true
			});
			removeObservableProperty(obj, 'qat');

			handle.remove();
			obj.foo = 4;
		}
	});
});