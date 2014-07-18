define([
	'intern!tdd',
	'intern/chai!assert',
	'../request',
	'../has'
], function (test, assert, request, has) {

	var requestUri = has('host-node') ? 'https://api.github.com/users/kitsonk' : '../../tests/resources/request.json';

	test.suite('core/request', function () {
		test.test('basic', function () {
			assert(request);
			assert(request.get);
			assert(request.post);
			assert(request.put);
			assert(request['delete']);
			assert(request.filterRegistry);
			assert(request.providerRegistry);
		});
		test.test('request()', function () {
			var dfd = this.async();
			request(requestUri).then(dfd.callback(function (response) {
				assert(response.data);
			}), dfd.reject.bind(dfd));
		});
		test.test('.get()', function () {
			var dfd = this.async();
			request.get(requestUri).then(dfd.callback(function (response) {
				assert(response.data);
			}), dfd.reject.bind(dfd));
		});
		test.test('filterRegistry - JSON', function () {
			var dfd = this.async();
			request(requestUri, { responseType: 'json' }).then(dfd.callback(function (response) {
				assert.typeOf(response.data, 'object');
			}));
		});
	});
});