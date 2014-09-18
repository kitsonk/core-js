define([
	'intern!object',
	'intern/chai!assert',
	'../../../request/xhr',
	'../../../errors/RequestTimeoutError',
	'../../../errors/CancelError',
	'../../../async',
	'../../../dom/query'
], function (registerSuite, assert, xhr, RequestTimeoutError, CancelError, async, query) {
	
	var hasFormData = 'FormData' in this && typeof FormData === 'function',
		formData;

	var isBrowser = typeof window !== 'undefined' &&
			typeof location !== 'undefined' &&
			typeof document !== 'undefined' &&
			window.location === location && window.document === document,
		isTrident, isIE;

	if (isBrowser) {
		isTrident = parseFloat(navigator.appVersion.split('Trident/')[1]) || undefined;
		isIE = parseFloat(navigator.appVersion.split('MSIE ')[1]) || undefined;
	}

	registerSuite({
		name: 'core/request/xhr',
		'get': function () {
			var promise = xhr('/__services/request/xhr', {
				method: 'get'
			});

			assert.isFunction(promise.then);

			return promise.then(function (response) {
				assert.equal(response.statusCode, 200);
				assert.equal(response.nativeResponse.readyState, 4);
				return response;
			});
		},
		'get - 404': function () {
			return xhr('xhr_blarh.html', {
				method: 'get'
			}).then(function (response) {
				assert.strictEqual(response.statusCode, 404);
			});
		},
		'get with query': function () {
			return xhr('/__services/request/xhr?color=blue', {
				query: {
					foo: [ 'bar', 'baz' ],
					thud: 'thonk',
					xyzzy: 3
				}
			}).then(function (response) {
				var data = JSON.parse(response.data),
					query = data.query;
				assert.strictEqual(data.method, 'GET');
				assert(query.color && query.foo && query.foo.length && query.thud && query.xyzzy);
				assert.strictEqual(query.color, 'blue');
				assert.strictEqual(query.foo.length, 2);
				assert.strictEqual(query.thud, 'thonk');
				assert.strictEqual(query.xyzzy, '3');
				assert.strictEqual(response.url,
					'/__services/request/xhr?color=blue&foo=bar&foo=baz&thud=thonk&xyzzy=3');
			});
		},
		'post': function () {
			return xhr('/__services/request/xhr', {
				method: 'post',
				data: { color: 'blue' }
			}).then(function (response) {
				var data = JSON.parse(response.data);
				assert.strictEqual(data.method, 'POST');
				assert.strictEqual(data.payload.color, 'blue');
				return response;
			});
		},
		'post with query': function () {
			return xhr('/__services/request/xhr', {
				method: 'post',
				query: {
					foo: [ 'bar', 'baz' ],
					thud: 'thonk',
					xyzzy: 3
				},
				data: { color: 'blue' }
			}).then(function (response) {
				var data = JSON.parse(response.data),
					query = data.query,
					payload = data.payload;

				assert.strictEqual(data.method, 'POST');

				assert(query);
				assert.deepEqual(query.foo, [ 'bar', 'baz' ]);
				assert.strictEqual(query.thud, 'thonk');
				assert.strictEqual(query.xyzzy, '3');

				assert(payload);
				assert.strictEqual(payload.color, 'blue');
			});
		},
		'post with string payload': function () {
			return xhr('/__services/request/xhr', {
				method: 'post',
				data: 'foo=bar&color=blue&height=average'
			}).then(function (response) {
				var data = JSON.parse(response.data),
					payload = data.payload;

				assert.strictEqual(data.method, 'POST');
				assert(payload);
				assert.strictEqual(payload.foo, 'bar');
				assert.strictEqual(payload.color, 'blue');
				assert.strictEqual(payload.height, 'average');
			});
		},
		'put': function () {
			return xhr('/__services/request/xhr', {
				method: 'put',
				data: { color: 'blue' }
			}).then(function (response) {
				var data = JSON.parse(response.data);
				assert.strictEqual(data.method, 'PUT');
				assert.strictEqual(data.payload.color, 'blue');
				return response;
			});
		},
		'delete': function () {
			return xhr('/__services/request/xhr', {
				method: 'delete',
				data: { color: 'blue' }
			}).then(function (response) {
				if (response.data) {
					var data = JSON.parse(response.data);
					assert.strictEqual(data.method, 'DELETE');
					assert.strictEqual(data.payload.color, 'blue');
				}
				return response;
			});
		},
		'timeout': function () {
			var dfd = this.async(3000),
				promise = xhr('/__services/request/xhr', {
					timeout: 1000,
					query: { delay: 3000 }
				});

			promise.then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, RequestTimeoutError);
			}));
		},
		'cancel': function () {
			var dfd = this.async(3000),
				promise = xhr('/__services/request/xhr', {
					query: { delay: 3000 }
				});

			promise.then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, CancelError);
			}));
			promise.cancel();
		},
		'blocking': function () {
			if (isTrident) {
				this.skip('Blocking not supported');
			}
			var dfd = this.async();

			var start = Date.now();
			xhr('/__services/request/xhr', {
				blockMainThread: true,
				query: { delay: 1000 }
			}).then(dfd.callback(function (response) {
				assert(response);
			}));

			assert((Date.now() - start) > 999);
		},
		'cross domain fails': function () {
			if (isTrident || isIE) {
				this.skip('Odd failure in IE');
			}
			var dfd = this.async();

			xhr('http://github.com/').then(dfd.reject.bind(dfd), dfd.callback(function () {
				return true;
			}));
		},
		'headers': function () {
			return xhr('/__services/request/xhr').then(function (response) {
				assert.notEqual(response.getHeader('Content-Type'), null);
			});
		},
		'queryable xml': function () {
			return xhr('/__services/request/xhr/xml', {
				responseType: 'xml'
			}).then(function (response) {
				assert.equal(query(response.data, 'bar').length, 2);
			});
		},
		'form data': {
			setup: function () {
				if (!hasFormData) { return; }

				formData = new FormData();
				formData.append('foo', 'bar');
				formData.append('baz', 'blah');
			},

			post: function () {
				if (!hasFormData) { return; }

				return xhr('/__services/request/xhr/multipart', {
					method: 'post',
					data: formData,
					resposeType: 'json',
				}).then(function (response) {
					var data = JSON.parse(response.data);
					assert(data.payload);
				});
			},

			teardown: function () {
				formData = null;
			}
		}
	});
});