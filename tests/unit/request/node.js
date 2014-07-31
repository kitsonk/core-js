define([
	'intern!object',
	'intern/chai!assert',
	'../../../request/node',
	'../../../errors/RequestTimeoutError',
	'../../../errors/CancelError'
], function (registerSuite, assert, node, RequestTimeoutError, CancelError) {
	var baseUrl = 'http://localhost:9001';

	registerSuite({
		name: 'core/request/node',
		'get': function () {
			var promise = node(baseUrl + '/__services/request/xhr', {
				method: 'get'
			});

			assert.isFunction(promise.then);

			return promise.then(function (response) {
				assert.equal(response.statusCode, 200);
				assert.isTrue(response.nativeResponse.complete);
				return response;
			});
		},
		'get - 404': function () {
			return node('http://www.kitsonkelly.com/bleurgh.html').then(function (response) {
				assert.equal(response.statusCode, 404);
			});
		},
		'get with query': function () {
			return node(baseUrl + '/__services/request/xhr?color=blue', {
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
					baseUrl + '/__services/request/xhr?color=blue&foo=bar&foo=baz&thud=thonk&xyzzy=3');
			});
		},
		'post': function () {
			return node(baseUrl + '/__services/request/xhr', {
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
			return node(baseUrl + '/__services/request/xhr', {
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
			return node(baseUrl + '/__services/request/xhr', {
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
			return node(baseUrl + '/__services/request/xhr', {
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
			return node(baseUrl + '/__services/request/xhr', {
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
				promise = node(baseUrl + '/__services/request/xhr', {
					timeout: 1000,
					query: { delay: 3000 }
				});

			promise.then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, RequestTimeoutError);
			}));
		},
		'cancel': function () {
			var dfd = this.async(3000),
				promise = node(baseUrl + '/__services/request/xhr', {
					query: { delay: 3000 }
				});

			promise.then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, CancelError);
			}));
			promise.cancel();
		}
	});
});