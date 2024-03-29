define([
	'intern!object',
	'intern/chai!assert',
	'../../../router/history',
	'../../../global',
	'../../../on'
], function (registerSuite, assert, history, global, on) {

	var current;

	function goBack() {
		window.history.back();
	}

	registerSuite({
		name: 'core/history',
		beforeEach: function () {
			var loc = global.location;
			current = loc.pathname + loc.search + loc.hash;
		},
		afterEach: function () {
			global.window.history.replaceState(null, '', current);
		},
		'basic': function () {
			var dfd = this.async(),
				count = 0,
				state1 = { foo: 'bar' },
				state2 = { bar: 'qat' };

			var handle = history.on('change', dfd.callback(function (e) {
				count++;
				if (count === 3) {
					assert.equal(location.pathname, '/test/url');
					assert(e);
					assert.deepEqual(state1, e.state);
					handle.remove();
				}
			}));

			var loc = history.get();
			assert('pathname' in loc);
			assert('hash' in loc);
			assert('search' in loc);
			assert('state' in loc);

			history.set('/test/url', state1);
			assert.equal(window.location.pathname, '/test/url');
			history.set('/test/url2', state2);
			assert.equal(window.location.pathname, '/test/url2');
			goBack();
		},
		'.get()': function () {
			window.history.pushState({}, '', '/test/url?foo=bar#baz');
			var loc = history.get();
			assert.equal(loc.pathname, '/test/url');
			assert.equal(loc.search, '?foo=bar');
			assert.equal(loc.hash, '#baz');
			assert.deepEqual(loc.state, {});

			window.history.replaceState({ foo: 'bar' }, '', '/test/bar');
			loc = history.get('/test');
			assert.equal(loc.pathname, '/bar');
			assert.equal(loc.search, '');
			assert.equal(loc.hash, '');
			assert.deepEqual(loc.state, { foo: 'bar' });

			window.history.replaceState({}, '', '/foo/bar');
			loc = history.get();
			assert.equal(loc.pathname, '/foo/bar');

			window.history.replaceState({}, '', '/test/foo/bar/test/qat');
			loc = history.get();
			assert.equal(loc.pathname, '/foo/bar/test/qat');
			history.init();
		},
		'.set()': function () {
			var dfd = this.async(),
				handle = on(global, 'popstate', dfd.callback(function () {
					handle.remove();
					var loc = global.location;
					console.log('history.get()', history.get());
					assert.strictEqual(loc.pathname, '/bar/qat');
				}));


			history.set('/foo/bar');
			var loc = history.get();
			console.log(loc);
			history.set('/bar/qat', { bar: 'qat' });
			loc = history.get();
			console.log(loc);
			history.set('/qat/baz', { qat: 'baz' });
			loc = history.get();
			console.log(loc);
			assert.strictEqual(loc.pathname, '/qat/baz');
			assert.strictEqual(loc.search, '');
			assert.strictEqual(loc.hash, '');
			assert.deepEqual(loc.state, { qat: 'baz' });
			goBack();
			console.log(global.location.pathname);
		},
		'on("change")': function () {
			var dfd = this.async(),
				count = 0,
				handle = history.on('change', function (e) {
					var loc;
					count++;
					switch (count) {
					case 1:
					case 2:
						console.log(e);
						break;
					case 3:
						loc = history.get();
						assert.equal(loc.pathname, '/foo/bar');
						assert.equal(loc.search, '');
						assert.equal(loc.hash, '');
						assert.deepEqual(loc.state, e.state);
						assert.deepEqual({ foo: 'bar' }, e.state);
						goBack();
						break;
					case 4:
						loc = history.get();
						handle.remove();
						dfd.callback(function () {
							assert(loc.pathname);
							assert.isNull(e.state);
						})();
						break;
					default:
						throw new Error('Too many calls');
					}
				});

			history.set('/foo/bar', { foo: 'bar' });
			history.set('/bar/baz', { bar: 'baz' });
			goBack();
		}
	});
});