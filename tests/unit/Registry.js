define([
	'intern!tdd',
	'intern/chai!assert',
	'../../Registry'
], function (test, assert, Registry) {
	test.suite('core/Registry', function () {
		test.test('creation', function () {
			var registry = new Registry();
			assert(registry.match);
			assert(registry.register);
			assert.throws(function () {
				registry.match('foo');
			}, Error);
		});
		test.test('defaultValue', function () {
			var registry = new Registry('foo');
			assert.equal(registry.match(), 'foo');
			assert.equal(registry.match({}), 'foo');
			assert.equal(registry.match({}, [], 'bar'), 'foo');
		});
		test.test('registration', function () {
			var registry = new Registry('foo');
			var handle = registry.register(function (value) {
				return value === 'bar';
			}, 'bar');
			assert.equal(registry.match(), 'foo');
			assert.equal(registry.match('foo'), 'foo');
			assert.equal(registry.match('bar'), 'bar');
			handle.remove();
			assert.equal(registry.match('bar'), 'foo');
			handle.remove();
			assert.equal(registry.match('bar'), 'foo');
		});
		test.test('first matching', function () {
			var registry = new Registry('foo');
			var handle = registry.register(function (value) {
					return value === 'bar';
				}, 'bar');
			registry.register(function (value) {
				return value === 'bar';
			}, 'baz');
			assert.equal(registry.match('foo'), 'foo');
			assert.equal(registry.match('bar'), 'bar');
			handle.remove();
			assert.equal(registry.match('bar'), 'baz');
			registry.register(function (value) {
				return value === 'bar';
			}, 'bar', true);
			assert.equal(registry.match('bar'), 'bar');
		});
		test.test('multiple arguments', function () {
			var registry = new Registry('foo');
			registry.register(function () {
				var args = Array.prototype.slice.call(arguments);
				return args.length === 4;
			}, 'bar');
			assert.equal(registry.match(1), 'foo');
			assert.equal(registry.match(1, 2, 3), 'foo');
			assert.equal(registry.match(1, 2, 3, 4), 'bar');
		});
	});
});