define([
	'intern!object',
	'intern/chai!assert',
	'../../../stores/IndexedDB',
	'../../../Promise',
	'../../../errors/StoreError',
	'../../../on'
], function (registerSuite, assert, IndexedDB, Promise, StoreError, on) {

	var store,
		all = Promise.all.bind(Promise);

	registerSuite({
		name: 'core/stores/IndexedDB',
		'creation': function () {
			store = new IndexedDB({
				name: 'storage',
				dbName: 'tests',
				data: [
					{id: 1, name: 'one', prime: false, mappedTo: 'E', date: new Date(1970, 0, 1) },
					{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D', date: new Date(1980, 1, 2) },
					{id: 3, name: 'three', prime: true, mappedTo: 'C', date: new Date(1990, 2, 3) },
					{id: 4, name: 'four', even: true, prime: false, mappedTo: null, date: new Date(1972, 3, 6, 12, 1) },
					{id: 5, name: 'five', prime: true, mappedTo: 'A', date: new Date(1972, 3, 6, 6, 2) }
				]
			});
			assert.isFunction(store.open);
			assert.isFunction(store.close);
			assert.isFunction(store.clear);
			assert.isFunction(store.get);
			assert.instanceOf(store, IndexedDB);
			return store.ready;
		},
		'.get()': function () {
			var promises = [];
			promises.push(store.get(1));
			promises.push(store.get(4));
			promises.push(store.get(5));
			return all(promises).then(function (results) {
				assert.equal(results[0].name, 'one');
				assert.equal(results[1].name, 'four');
				assert.isTrue(results[2].prime);
			});
		},
		'.query()': function () {
			var promises = [];
			promises.push(store.query({ prime: true }));
			promises.push(store.query({ even: true }));
			return all(promises).then(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1][1].name, 'four');
			});
		},
		'.query() - with string': function () {
			return store.query({ name: 'two' }).then(function (results) {
				assert.equal(results.length, 1);
				assert.equal(results[0].name, 'two');
			});
		},
		'.query() - with RegExp': function () {
			var promises = [];
			promises.push(store.query({ name: /^t/ }));
			promises.push(store.query({ name: /^o/ }));
			promises.push(store.query({ name: /o/ }));
			return all(promises).then(function (results) {
				assert.equal(results[0].length, 2);
				assert.equal(results[0][1].name, 'three');
				assert.equal(results[1].length, 1);
				assert.equal(results[2].length, 3);
			});
		},
		'.query() - with function': function () {
			var promises = [];
			promises.push(store.query({ id: { test: function (id) { return id < 4; } } }));
			promises.push(store.query({ even: { test: function (even, object) { return even && object.id > 2; } } }));
			return all(promises).then(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1].length, 1);
			});
		},
		'.query() - with sort': function () {
			var promises = [];
			promises.push(store.query({ prime: true }, { sort: [ { attribute: 'name' } ] }));
			promises.push(store.query({ even: true }, { sort: [ { attribute: 'name' } ] }));
			promises.push(store.query({ even: true }, { sort: function (a, b) {
				return a.name < b.name ? -1 : 1;
			} }));
			promises.push(store.query(null, { sort: [ { attribute: 'mappedTo' } ] }));
			promises.push(store.query({}, { sort: [ { attribute: 'date', descending: false } ] })
					.map(function (item) {
				return item.id;
			}));
			return all(promises).then(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1][1].name, 'two');
				assert.equal(results[2][1].name, 'two');
				assert.equal(results[3][4].name, 'four');
				assert.deepEqual(results[4], [ 1, 5, 4, 2, 3 ]);
			});
		},
		'.query() - with paging': function () {
			var promises = [];
			promises.push(store.query({ prime: true }, { start: 1, count: 1 }));
			promises.push(store.query({ even: true }, { start: 1, count: 1 }));
			return all(promises).then(function (results) {
				assert.equal(results[0].length, 1);
				assert.equal(results[1][0].name, 'four');
			});
		},
		'.put() - update': function () {
			return store.get(4).then(function (four) {
				four = Object.create(four);
				four.square = true;
				return store.put(four);
			}).then(function () {
				return store.get(4);
			}).then(function (four) {
				assert.isTrue(four.square);
			});
		},
		'.put() - new': function () {
			return store.put({
				id: 6,
				perfect: true
			}).then(function () {
				return store.get(6);
			}).then(function (result) {
				assert.isTrue(result.perfect);
			});
		},
		'.add() - duplicate': function () {
			var dfd = this.async();
			return store.add({
				id: 6,
				perfect: true
			}).then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, StoreError);
			}));
		},
		'.add() - new': function () {
			return store.add({
				id: 7,
				prime: true
			}).then(function () {
				return store.get(7);
			}).then(function (result) {
				assert.isTrue(result.prime);
			});
		},
		'.add() - new with id assignment': function () {
			var obj = { random: true };
			return store.add(obj).then(function () {
				assert(obj.id);
			});
		},
		'.remove()': function () {
			return store.remove(7).then(function () {
				return store.get(7);
			}).then(function (result) {
				assert.isUndefined(result);
			});
		},
		/* IndexedDB appears to return success when there is a missing .delete() from an object store */
		// '.remove() - missing': function () {
		// 	var dfd = this.async();
		// 	return store.remove(77).then(dfd.reject.bind(dfd), function (error) {
		// 		assert.instanceOf(error, StoreError);
		// 		store.get(1).then(dfd.callback(function (result) {
		// 			assert.equal(result.id, 1);
		// 		}));
		// 	});
		// },
		'.query() - after changes': function () {
			var promises = [];
			promises.push(store.query({ prime: true }));
			promises.push(store.query({ perfect: true }));
			return all(promises).then(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1].length, 1);
			});
		},
		'persistance': function () {
			var store2 = new IndexedDB({
				name: 'storage',
				dbName: 'tests'
			});

			return store2.ready.then(function () {
				return store2.query({ prime: true }).then(function (results) {
					assert.equal(results.length, 3);
					return store2.close();
				});
			});
		},
		'events': {
			'using on': function () {
				var dfd = this.async();
				on(store, 'get', dfd.callback(function (e) {
					assert(e);
				}));
				store.get(1);
			},
			'get': function () {
				var dfd = this.async(),
					handle = store.on('get', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'get');
						assert.equal(e.id, 3);
						assert.isUndefined(e.options);
						assert.equal(e.object.name, 'three');
						handle.remove();
					}));
				store.get(3);
			},
			'add': function () {
				var dfd = this.async(),
					handle = store.on('add', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'add');
						assert.equal(e.response, 8);
						assert.equal(e.object.name, 'eight');
						handle.remove();
					})),
					handle2 = store.on('put', function () {
						handle2.remove();
						dfd.reject();
					});
				store.add({ id: 8, name: 'eight', event: true, prime: false });
			},
			'put': function () {
				var dfd = this.async(),
					handle = store.on('put', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'put');
						assert.equal(e.response, 8);
						assert.isFalse(e.object.square);
						handle.remove();
					}));
				store.put({ id: 8, name: 'eight', square: false, event: true, prime: false });
			},
			'remove': function () {
				var dfd = this.async(),
					handle = store.on('remove', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'remove');
						assert.equal(e.id, 8);
						handle.remove();
					}));
				store.remove(8);
			},
			'query': function () {
				var dfd = this.async(),
					handle = store.on('query', dfd.callback(function (e) {
						assert.strictEqual(e.target, store);
						assert.equal(e.type, 'query');
						assert.deepEqual(e.query, { name: 'two' });
						assert.equal(e.results.length, 1);
						handle.remove();
					}));
				store.query({ name: 'two' });
			},
		},
		'clear': function () {
			return store.clear().then(function () {
				return store.query({ prime: true }).then(function (results) {
					assert.equal(results.length, 0);
				});
			});
		},
		'close': function () {
			assert.equal(store.state, 'open');
			return store.close().then(function () {
				assert.equal(store.state, 'closed');
			});
		}
	});
});