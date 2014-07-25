define([
	'intern!tdd',
	'intern/chai!assert',
	'../../observe',
	'../../has'
], function (test, assert, observe, has) {
	test.suite('core/observe', function () {
		test.test('feature detection', function () {
			if (typeof Object.observe === 'function') {
				assert.isTrue(has('es7-object-observe'));
			}
			else {
				assert.isFalse(has('es7-object-observe'));
			}
		});
		test.test('getNotifier', function () {
			var obj = {};

			function callback() {}

			observe(obj, callback);
			var notifier = observe.getNotifier(obj);
			assert(notifier);
			assert.strictEqual('function', typeof notifier.notify);
		});
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
		test.test('observe.defineProperty', function () {
			var dfd = this.async(250);

			var obj = {
				foo: 'bar'
			};

			var callback = dfd.callback(function (changeRecords) {
				assert.strictEqual(3, changeRecords.length);
				assert.strictEqual('updated', changeRecords[0].type);
				assert.strictEqual('foo', changeRecords[0].name);
				assert.strictEqual('updated', changeRecords[1].type);
				assert.strictEqual('foo', changeRecords[1].name);
				assert.strictEqual('new', changeRecords[2].type);
				assert.strictEqual('bar', changeRecords[2].name);

				var foo = Object.getOwnPropertyDescriptor(obj, 'foo');
				var bar = Object.getOwnPropertyDescriptor(obj, 'bar');
				assert.typeOf(foo.get, 'function');
				assert.typeOf(foo.set, 'function');
				assert.strictEqual('bar', foo.get());
				assert.typeOf(bar.get, 'function');
				assert.typeOf(bar.set, 'function');
				assert.strictEqual(1, bar.get());
			});

			observe(obj, callback);

			obj.foo = 'qat';
			observe.defineProperty(obj, 'foo', {
				value: 'bar',
				writable: true,
				enumerable: true,
				configurable: true
			});
			observe.defineProperty(obj, 'bar', {
				value: 1,
				writable: true,
				enumerable: true,
				configurable: true
			});
		});
		test.test('observe.defineProperties', function () {
			var dfd = this.async(250);

			var obj = {
				foo: 'bar',
				bar: 1
			};

			var baz = 'qat';

			var callback = dfd.callback(function (changeRecords) {
				assert.strictEqual(3, changeRecords.length);
				assert.strictEqual('updated', changeRecords[0].type);
				assert.strictEqual('foo', changeRecords[0].name);
				assert.strictEqual('new', changeRecords[1].type);
				assert.strictEqual('baz', changeRecords[1].name);
				assert.strictEqual('updated', changeRecords[2].type);
				assert.strictEqual('baz', changeRecords[2].name);
			});

			observe(obj, callback);

			observe.defineProperties(obj, {
				foo: {
					value: 'qat',
					writable: true,
					enumerable: true,
					configurable: true
				},
				baz: {
					get: function () {
						return baz;
					},
					set: function (value) {
						baz = value;
					},
					enumerable: true,
					configurable: true
				}
			});

			obj.baz = 'foo';
			assert.strictEqual('foo', obj.baz);
		});
		test.test('observe.removeProperty', function () {
			var dfd = this.async(250);

			var obj = {
				foo: 'bar'
			};

			var callback = dfd.callback(function (changeRecords) {
				assert.strictEqual(1, changeRecords.length);
				assert.strictEqual('deleted', changeRecords[0].type);
				assert.strictEqual('foo', changeRecords[0].name);
				assert.strictEqual('bar', changeRecords[0].oldValue);
			});

			observe(obj, callback);

			observe.removeProperty(obj, 'foo');
			assert.isFalse('foo' in obj);
		});
		test.test('observe.removeProperties', function () {
			var dfd = this.async(250);

			var obj = {
				foo: 'bar',
				bar: 1,
				baz: null
			};

			var callback = dfd.callback(function (changeRecords) {
				assert.strictEqual(2, changeRecords.length);
			});

			observe(obj, callback);

			observe.removeProperties(obj, ['foo', 'baz']);
			assert.isFalse('foo' in obj);
			assert.isTrue('bar' in obj);
			assert.isFalse('baz' in obj);
		});
		test.suite('observe.summary', function () {
			test.test('basic', function () {
				var dfd = this.async(250);

				var obj = {
					foo: 'bar',
					baz: 1
				};

				var callback = dfd.callback(function (added, removed, changed, oldValueFn) {
					assert.strictEqual('qat', changed.foo);
					assert.strictEqual(2, changed.baz);
					assert.deepEqual({}, added);
					assert.deepEqual({}, removed);
					assert.strictEqual('bar', oldValueFn('foo'));
					assert.strictEqual(1, oldValueFn('baz'));
				});

				observe.summary(obj, callback);
				obj.foo = 'qat';
				obj.baz = 2;
			});
		});
		test.suite('observe.array', function () {
			test.test('basic', function () {
				var dfd = this.async(250);

				var arr = [ 1, 2, 3 ];

				var callback = dfd.callback(function (splices) {
					assert.strictEqual(2, splices.length);
					assert.strictEqual(3, splices[0].addedCount);
					assert.strictEqual(3, splices[0].index);
					assert.strictEqual(0, splices[0].removed.length);
					assert.strictEqual(0, splices[1].addedCount);
					assert.strictEqual(5, splices[1].index);
					assert.deepEqual([ 6 ], splices[1].removed);
					assert.deepEqual([ 1, 2, 3, 4, 5 ], arr);
				});

				observe.array(arr, callback);

				arr.push(4, 5, 6);
				assert.strictEqual(6, arr.pop());
			});
		});
		test.suite('observe.path', function () {
			test.test('basic', function () {
				var dfd = this.async(250);

				var obj = { foo: 'bar' };

				var callback = dfd.callback(function (newValue, oldValue) {
					assert.strictEqual('bar', oldValue);
					assert.strictEqual('qat', newValue);
					assert.strictEqual(obj, this);
				});

				observe.path(obj, 'foo', callback);
				obj.foo = 'qat';
			});
			test.test('deep', function () {
				var dfd = this.async(250);

				var obj = {
					foo: {
						bar: {
							baz: {
								qat: 'foo'
							}
						}
					}
				};

				var callback = dfd.callback(function (newValue, oldValue) {
					assert.strictEqual('foo', oldValue);
					assert.strictEqual('bar', newValue);
				});

				observe.path(obj, 'foo.bar.baz.qat', callback);
				obj.foo.bar.baz.qat = 'bar';
			});
			test.test('remove', function () {
				var obj = {
					foo: 'bar'
				};

				var callback = function () {
					throw new Error('I was called!');
				};

				var handle = observe.path(obj, 'foo', callback);
				handle.remove();
				obj.foo = 'test';
			});
		});
	});
});