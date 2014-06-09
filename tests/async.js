define([
	'intern!tdd',
	'intern/chai!assert',
	'../async'
], function (test, assert, async) {
	test.suite('core/async', function () {
		test.test('function not called until next turn', function () {
			var dfd = this.async(1000);

			var value = false;

			async(function () {
				value = true;
				async(dfd.callback(function () {
					assert.strictEqual(value, true, 'should be true afterwards');
				}));
			});

			assert.strictEqual(value, false, 'should be false before next turn');
		});
		test.test('preserves scope', function () {
			var dfd = this.async(1000);

			async(dfd.callback(function () {
				assert.equal(this.foo, 'bar', 'this.foo == "bar"');
			}), { foo: 'bar' });
		});
	});
});