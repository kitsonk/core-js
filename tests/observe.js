define([
	'intern!tdd',
	'intern/chai!assert',
	'../observe'
], function (test, assert, observe) {
	test.suite('core/observe', function () {
		test.test('basic', function () {
			var dfd = this.async(1000);

			var obj = {
				foo: 'bar',
				bar: 0
			};

			var callback = dfd.callback(function (changeRecords) {
				assert.strictEqual(6, changeRecords.length);
				assert.strictEqual('foo', changeRecords[0].name);
				assert.strictEqual(obj, changeRecords[0].object);
				assert.strictEqual('updated', changeRecords[0].type);
				assert.strictEqual('bar', changeRecords[0].oldValue);
				assert.strictEqual('bar', changeRecords[5].name);
				assert.strictEqual(obj, changeRecords[5].object);
				assert.strictEqual('updated', changeRecords[5].type);
				assert.strictEqual(2, changeRecords[5].oldValue);
			});

			observe(obj, null, callback);

			assert.deepEqual(['foo', 'bar'], Object.keys(obj), 'enumerability preserved');
			obj.foo = 'qat';
			obj.bar = 1;
			obj.foo = 'foo';
			obj.bar = 2;
			obj.foo = 'bar';
			obj.bar = 0;
			assert.strictEqual('bar', obj.foo);
			assert.strictEqual(0, obj.bar);
		});
	});
});