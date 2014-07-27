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
				var data = JSON.parse(response.data);
				assert.strictEqual(data.method, 'DELETE');
				assert.strictEqual(data.payload.color, 'blue');
				return response;
			});
		},
		'timeout': function () {
			var dfd = this.async(3000),
				promise = xhr('/__services/request/xhr?delay=3000', {
					timeout: 1000
				});

			promise.then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, RequestTimeoutError);
			}));
		},
		'cancel': function () {
			var dfd = this.async(3000),
				promise = xhr('/__services/request/xhr?delay=3000');

			promise.then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, CancelError);
			}));
			promise.cancel();
		},
		'blocking': function () {
			var dfd = this.async();

			var start = Date.now();
			xhr('/__services/request/xhr?delay=1000', {
				blockMainThread: true
			}).then(dfd.callback(function (response) {
				assert(response);
			}));

			assert((Date.now() - start) > 999);
		},
		'cross domain fails': function () {
			var dfd = this.async();

			xhr('http://kitsonkelly.com').then(dfd.reject.bind(dfd), dfd.callback(function () {
				return true;
			}));
		},
		'headers': function () {
			return xhr('/__services/request/xhr').then(function (response) {
				assert.notEqual(response.getHeader('Content-Type'), null);
			});
		},
		'queryably xml': function () {
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