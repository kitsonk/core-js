define([
	'intern!object',
	'intern/chai!assert',
	'../../../router/history',
	'../../../global',
	'../../../on'
], function (registerSuite, assert, history, global, on) {
	registerSuite({
		name: 'core/history',
		'basic': function () {
			var dfd = this.async(),
				state1 = { foo: 'bar' },
				state2 = { bar: 'qat' };

			var handle = history.on('change', dfd.callback(function (e) {
				assert.equal(location.pathname, '/test/url');
				assert(e);
				assert.deepEqual(state1, e.state);
				history.set(loc.path + loc.search + loc.hash, loc.state, true);
				handle.remove();
			}));

			loc = history.get();
			assert('path' in loc);
			assert('hash' in loc);
			assert('search' in loc);
			assert('state' in loc);

			history.set('/test/url', state1);
			assert.equal(window.location.pathname, '/test/url');
			history.set('/test/url2', state2);
			assert.equal(window.location.pathname, '/test/url2');
			window.history.go(-1);
		},
		'.get': function () {
			var loc = history.get(),
				orig = loc.path + loc.search + loc.hash;
			window.history.pushState({}, '', '/test/url?foo=bar#baz');
			loc = history.get();
			assert.equal(loc.path, '/test/url');
			assert.equal(loc.search, '?foo=bar');
			assert.equal(loc.hash, '#baz');
			assert.deepEqual(loc.state, {});
			window.history.go(-1);
			window.history.pushState({ foo: 'bar' }, '', '/test/bar');
			loc = history.get('/test');
			assert.equal(loc.path, '/bar');
			assert.equal(loc.search, '');
			assert.equal(loc.hash, '');
			assert.deepEqual(loc.state, { foo: 'bar' });
			window.history.go(-1);
			window.history.pushState({}, '', '/foo/bar');
			loc = history.get();
			assert.equal(loc.path, '/foo/bar');
			window.history.go(-1);
			window.history.pushState({}, '', '/test/foo/bar/test/qat');
			loc = history.get();
			assert.equal(loc.path, '/foo/bar/test/qat');
			window.history.pushState({}, '', orig);
		}
	});
});