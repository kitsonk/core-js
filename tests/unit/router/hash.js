define([
	'intern!object',
	'intern/chai!assert',
	'../../../router/hash',
	'../../../on'
], function (registerSuite, assert, hash, on) {

	registerSuite({
		name: 'core/router/hash',
		'api': function () {
			assert.isFunction(hash.set);
			assert.isFunction(hash.get);
			assert.isNull(hash.onchange);
		},
		'.get()': function () {
			assert.strictEqual(hash.get(), '');
			location.href = '#test';
			assert.strictEqual(hash.get(), 'test');
		},
		'.set()': function () {
			hash.set('');
			assert.strictEqual(location.href.substring(location.href.indexOf('#') + 1), '');
			hash.set('test');
			assert.strictEqual(location.href.substring(location.href.indexOf('#') + 1), 'test');
			hash.set('foo', true);
			assert.strictEqual(location.href.substring(location.href.indexOf('#') + 1), 'foo');
			location.href = '#';
		},
		'.onchange': function () {
			var dfd = this.async(),
				count = 0,
				handle = on(hash, 'change', function (e) {
					count++;
					switch (count) {
					case 1:
						assert.equal(e.newHash, 'foo');
						assert.equal(e.oldHash, '');
						break;
					case 2:
						assert.equal(e.newHash, 'bar');
						assert.equal(e.oldHash, 'foo');
						break;
					case 3:
						assert.equal(e.newHash, 'baz');
						assert.equal(e.oldHash, 'bar');
						break;
					case 4:
						assert.equal(e.newHash, '');
						assert.equal(e.oldHash, 'baz');
						dfd.callback(function () {
							handle.remove();
						})();
						break;
					default:
						throw new Error('Too many calls');
					}
				});

			hash.set('foo');
			hash.set('bar', true);
			location.href = '#baz';
			location.href = '#';
		}
	});

});