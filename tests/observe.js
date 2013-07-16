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

			var handle = observe(obj, callback);

			assert.deepEqual(['foo', 'bar'], Object.keys(obj), 'enumerability preserved');
			obj.foo = 'qat';
			obj.bar = 1;
			obj.foo = 'foo';
			obj.bar = 2;
			obj.foo = 'bar';
			obj.bar = 0;
			assert.strictEqual('bar', obj.foo);
			assert.strictEqual(0, obj.bar);

			handle.remove();
			obj.foo = 'qat';
			obj.bar = 4;
		});
		test.test('array', function () {
			var dfd = this.async(1000);

			var arr = [];

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(16, changeRecords.length);
				assert.equal('new', changeRecords[0].type);
				assert.equal(0, changeRecords[0].name);
				assert.equal('updated', changeRecords[1].type);
				assert.equal('length', changeRecords[1].name);
				assert.equal(0, changeRecords[1].oldValue);
				assert.equal('deleted', changeRecords[14].type);
				assert.equal(2, changeRecords[14].name);
				assert.equal(3, changeRecords[14].oldValue);
				assert.equal('updated', changeRecords[15].type);
				assert.equal('length', changeRecords[15].name);
				assert.equal(3, changeRecords[15].oldValue);
			});

			assert.isFalse('get' in arr);
			assert.isFalse('set' in arr);

			observe(arr, callback);

			assert.isTrue('get' in arr);
			assert.isTrue('set' in arr);

			arr.push(1);
			assert.strictEqual(1, arr.pop(), 'should return last element');
			arr.push(2);
			arr.push(3);
			arr.unshift(1);
			assert.strictEqual(1, arr.shift(), 'should return first element');
		});
	});
});