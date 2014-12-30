define([
	'intern!object',
	'intern/chai!assert',
	'../../../router/hash',
	'../../../on',
	'../../../sniff'
], function (registerSuite, assert, hash, on, has) {

	function getCurrentHash() {
		return location.href.substring(location.href.indexOf('#') + 1) || '';
	}

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
			assert.equal(getCurrentHash(), '');
			hash.set('test');
			assert.equal(getCurrentHash(), 'test');
			hash.set('foo', true);
			assert.equal(getCurrentHash(), 'foo');
			hash.set('');
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
						hash.set('bar', true);
						break;
					case 2:
						assert.equal(e.newHash, 'bar');
						assert.equal(e.oldHash, 'foo');
						dfd.callback(function () {
							handle.remove();
							location.href = '#';
						})();
						break;
					default:
						throw new Error('Too many calls');
					}
				});

			hash.set('foo');
		},
		'.onchange - direct setting': function () {
			if (has('ie') || has('trident')) {
				this.skip('Not supported on IE');
			}
			var dfd = this.async(),
				count = 0,
				handle = on(hash, 'change', function (e) {
					count++;
					switch (count) {
					case 1:
						assert.equal(e.newHash, 'baz');
						assert.equal(e.oldHash, '');
						break;
					case 2:
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

			location.href = '#baz';
			location.href = '#';			
		}
	});

});