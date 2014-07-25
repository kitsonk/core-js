define([
	'intern!object',
	'intern/chai!assert',
	'../../io-query'
], function (registerSuite, assert, ioQuery) {
	registerSuite({
		name: 'core/io-query',
		'objectToQuery()': function () {
			var obj = {
				foo: 'bar',
				'odd&': 'but = valid',
				more: 123,
				multi: [ 'baz', 'qat' ]
			};
			assert.equal(ioQuery.objectToQuery(obj), 'foo=bar&odd%26=but%20%3D%20valid&more=123&multi=baz&multi=qat');
		},
		'queryToObject()': function () {
			var str = 'foo=bar&odd%26=but%20%3D%20valid&more=123&multi=baz&multi=qat',
				obj = {
					foo: 'bar',
					'odd&': 'but = valid',
					more: '123',
					multi: [ 'baz', 'qat' ]
				};
			assert.deepEqual(ioQuery.queryToObject(str), obj);
		}
	});
});