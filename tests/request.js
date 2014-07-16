define([
	'intern!tdd',
	'intern/chai!assert',
	'../request'
], function (test, assert, request) {
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
			request('https://api.github.com/users/dojo', { responseType: 'json' }).then(dfd.callback(function (response) {
				assert(response.data);
			}), dfd.reject.bind(dfd));
		});
	});
});