define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/path'
], function (registerSuite, assert, observePath) {
	registerSuite({
		name: 'core/observe/path',
		'basic': function () {
			var dfd = this.async(250);

			var obj = { foo: 'bar' };

			var callback = dfd.callback(function (newValue, oldValue) {
				assert.strictEqual('bar', oldValue);
				assert.strictEqual('qat', newValue);
				assert.strictEqual(obj, this);
			});

			var handle = observePath(obj, 'foo', callback);
			obj.foo = 'qat';

			handle.remove();
			obj.foo = 4;
		},
		'deep': function () {
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

			observePath(obj, 'foo.bar.baz.qat', callback);
			obj.foo.bar.baz.qat = 'bar';
		},
		'throws': function () {
			assert.throws(function () {
				observePath({}, 'foo', function () {});
			}, Error);

			assert.throws(function () {
				observePath({ foo: 1 }, 'foo.bar', function () {});
			}, TypeError);
		}
	});
});