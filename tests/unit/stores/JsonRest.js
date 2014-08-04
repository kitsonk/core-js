define([
	'intern!object',
	'intern/chai!assert',
	'core/Promise',
	'core/lang',
	'core/tests/unit/support/requestStub',
	'sinon'
], function (registerSuite, assert, Promise, lang, requestStub) {

	var JsonRest,
		store,
		globalHeaders = {
			'test-global-header-a': true,
			'test-global-header-b': 'yes'
		},
		requestHeaders = {
			'test-local-header-a': true,
			'test-local-header-b': 'yes',
			'test-override': 'overridden'
		};

	function assertHeaders(xhrHeaders) {
		var expectedHeaders = Array.prototype.slice.call(arguments, 1);

		expectedHeaders.push(globalHeaders);
		expectedHeaders.forEach(function (headers) {
			for (var key in headers) {
				if (headers.hasOwnProperty(key)) {
					assert.propertyVal(xhrHeaders, key, headers[key]);
				}
			}
		});
	}

	registerSuite({
		name: 'core/stores/JsonRest',
		setup: function () {
			return new Promise(function (resolve) {
				require({
					map: {
						'core/stores/JsonRest': {
							'core/request': 'core/tests/unit/support/requestStub'
						}
					}
				}, [ 'core/stores/JsonRest' ], function (_JsonRest) {
					JsonRest = _JsonRest;
					resolve();
				});
			});
		},
		beforeEach: function () {
			requestStub.reset();
			store = new JsonRest({
				target: require.toUrl('core/tests/store/x.y').match(/(.+)x\.y$/)[1],
				headers: lang.mixin({ 'test-override': false }, globalHeaders)
			});
		},

		'.get()': {
			beforeEach: function () {
				var data = {
						id: 'node1.1',
						name: 'node1.1',
						someProperty: 'somePropertyA1',
						children: [
							{ $ref: 'node1.1.1', name: 'node1.1.1' },
							{ $ref: 'node1.1.2', name: 'node1.1.2' }
						]
					};

				requestStub.returns(new Promise(function (resolve) {
					resolve({ data: data });
				}));
			},
			'test': function () {
				var dfd = this.async(),
					expectedName = 'node1.1';

				store.get(expectedName).then(dfd.callback(function (object) {
					assert.equal(object.name, expectedName);
					assert.equal(object.someProperty, 'somePropertyA1');
				}), dfd.reject.bind(dfd));
			},
			'headers provided in options': function () {
				var xhrOptions;

				store.get('destinationUrl', { headers: requestHeaders });
				xhrOptions = requestStub.lastCall.args[1];

				assertHeaders(xhrOptions.headers, requestHeaders);
			},
			'emit event': function () {
				var dfd = this.async(),
					handle = store.on('get', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'get');
						assert.equal(e.object.name, 'node1.1');
						assert(e.options.headers);
						handle.remove();
					}));

				store.get('destinationUrl', { headers: requestHeaders });
			}
		},
		'.query()': {
			beforeEach: function () {
				var response = {
						getHeader: function () {
							return '1-10/25';
						},
						data: [
							{ id: 'node1', name: 'node1', someProperty: 'somePropertyA', children: [
								{ $ref: 'node1.1', name: 'node1.1', children: true },
								{ $ref: 'node1.2', name: 'node1.2' }
							] },
							{ id: 'node2', name: 'node2', someProperty: 'somePropertyB' },
							{ id: 'node3', name: 'node3', someProperty: 'somePropertyC' },
							{ id: 'node4', name: 'node4', someProperty: 'somePropertyA' },
							{ id: 'node5', name: 'node5', someProperty: 'somePropertyB' }
						]
					};
				
				requestStub.returns(new Promise(function (resolve) {
					resolve(response);
				}));
			},
			'test': function () {
				var dfd = this.async();

				store.query('treeTestRoot').then(dfd.callback(function (results) {
					var object = results[0];
					assert.equal(object.name, 'node1');
					assert.equal(object.someProperty, 'somePropertyA');
				}), dfd.reject.bind(dfd));
			},
			'result iteration': function () {
				return store.query('treeTestRoot').forEach(function (object, index) {
					assert.equal(object.name, 'node' + (index + 1));
				});
			},
			'headers provided in options with range': function () {
				var expectedRangeHeaders = { 'X-Range': 'items=20-61', 'Range': 'items=20-61' },
					xhrOptions;

				store.query({}, { headers: requestHeaders, start: 20, count: 42 });
				xhrOptions = requestStub.lastCall.args[1];

				assertHeaders(xhrOptions.headers, requestHeaders, expectedRangeHeaders);
			},
			'total': function () {
				return store.query({}, { headers: requestHeaders }).total.then(function (total) {
					assert.equal(total, 25);
				});
			},
			'emit event': function () {
				var dfd = this.async(),
					handle = store.on('query', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'query');
						assert.equal(e.query, '?foo=bar');
						assert(e.response.data);
						assert(e.results.length, 5);
						assert(e.options.headers);
						handle.remove();
					}));

				store.query({ foo: 'bar' }, { headers: requestHeaders });
			}
		},
		'.remove()': {
			'headers provided in options': function () {
				var xhrOptions;

				store.remove('destinationUrl', { headers: requestHeaders });
				xhrOptions = requestStub.lastCall.args[1];

				assertHeaders(xhrOptions.headers, requestHeaders);
			},
			'emit event': function () {
				var dfd = this.async(),
					handle = store.on('remove', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'remove');
						assert.equal(e.id, 'destinationUrl');
						assert(e.options.headers);
						assert(e.response);
						handle.remove();
					}));

				store.remove('destinationUrl', { headers: requestHeaders });
			}
		},
		'.put()': {
			'headers provided in options': function () {
				var xhrOptions;

				store.put({}, { headers: requestHeaders });
				xhrOptions = requestStub.lastCall.args[1];

				assertHeaders(xhrOptions.headers, requestHeaders);
			},
			'emit event': function () {
				var dfd = this.async(),
					handle = store.on('put', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'put');
						assert(e.object);
						assert(e.options.headers);
						assert(e.response);
						handle.remove();
					}));

				store.put({}, { headers: requestHeaders });
			}
		},
		'.add()': {
			'headers provided in options': function () {
				var xhrOptions;

				store.add({}, { headers: requestHeaders });
				xhrOptions = requestStub.lastCall.args[1];

				assertHeaders(xhrOptions.headers, requestHeaders);
			},
			'emit event': function () {
				var dfd = this.async(),
					handle = store.on('add', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'add');
						assert(e.object);
						assert(e.options.headers);
						assert(e.response);
						handle.remove();
					})),
					handle2 = store.on('put', function () {
						handle2.remove();
						dfd.reject();
					});

				store.add({}, { headers: requestHeaders });
			}
		},
		teardown: function () {
			requestStub.throws(new Error('this is a stub function'));
		}
	});
});
