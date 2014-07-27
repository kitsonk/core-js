define([
	'intern!tdd',
	'intern/chai!assert',
	'../../request',
	'../../has!host-browser?./request/xhr'
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
	});
});