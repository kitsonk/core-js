define([
	'intern!object',
	'intern/chai!assert',
	'../../../stores/Memory',
	'../../../Promise',
	'../../../errors/StoreError',
	'../../../on'
], function (registerSuite, assert, Memory, Promise, StoreError, on) {

	var all = Promise.all.bind(Promise);

	var store = new Memory({
		data: [
			{id: 1, name: 'one', prime: false, mappedTo: 'E', date: new Date(1970, 0, 1) },
			{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D', date: new Date(1980, 1, 2) },
			{id: 3, name: 'three', prime: true, mappedTo: 'C', date: new Date(1990, 2, 3) },
			{id: 4, name: 'four', even: true, prime: false, mappedTo: null, date: new Date(1972, 3, 6, 12, 1) },
			{id: 5, name: 'five', prime: true, mappedTo: 'A', date: new Date(1972, 3, 6, 6, 2) }
		]
	});

	registerSuite({
		name: 'core/stores/Memory',
		'.get()': function () {
			var dfd = this.async(),
				promises = [];
			promises.push(store.get(1));
			promises.push(store.get(4));
			promises.push(store.get(5));
			all(promises).then(dfd.callback(function (results) {
				assert.equal(results[0].name, 'one');
				assert.equal(results[1].name, 'four');
				assert.isTrue(results[2].prime);
			}), dfd.reject.bind(dfd));
		},
		'.query()': function () {
			var dfd = this.async(),
				promises = [];
			promises.push(store.query({ prime: true }));
			promises.push(store.query({ even: true }));
			all(promises).then(dfd.callback(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1][1].name, 'four');
			}), dfd.reject.bind(dfd));
		},
		'.query() - with string': function () {
			var dfd = this.async();
			store.query({ name: 'two' }).then(dfd.callback(function (results) {
				assert.equal(results.length, 1);
				assert.equal(results[0].name, 'two');
			}), dfd.reject.bind(dfd));
		},
		'.query() - with RegExp': function () {
			var dfd = this.async(),
				promises = [];
			promises.push(store.query({ name: /^t/ }));
			promises.push(store.query({ name: /^o/ }));
			promises.push(store.query({ name: /o/ }));
			all(promises).then(dfd.callback(function (results) {
				assert.equal(results[0].length, 2);
				assert.equal(results[0][1].name, 'three');
				assert.equal(results[1].length, 1);
				assert.equal(results[2].length, 3);
			}), dfd.reject.bind(dfd));
		},
		'.query() - with function': function () {
			var dfd = this.async(),
				promises = [];
			promises.push(store.query({ id: { test: function (id) { return id < 4; } } }));
			promises.push(store.query({ even: { test: function (even, object) { return even && object.id > 2; } } }));
			all(promises).then(dfd.callback(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1].length, 1);
			}), dfd.reject.bind(dfd));
		},
		'.query() - with sort': function () {
			var dfd = this.async(),
				promises = [];
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
			all(promises).then(dfd.callback(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1][1].name, 'two');
				assert.equal(results[2][1].name, 'two');
				assert.equal(results[3][4].name, 'four');
				assert.deepEqual(results[4], [ 1, 5, 4, 2, 3 ]);
			}));
		},
		'.query() - with paging': function () {
			var dfd = this.async(),
				promises = [];
			promises.push(store.query({ prime: true }, { start: 1, count: 1 }));
			promises.push(store.query({ even: true }, { start: 1, count: 1 }));
			all(promises).then(dfd.callback(function (results) {
				assert.equal(results[0].length, 1);
				assert.equal(results[1][0].name, 'four');
			}));
		},
		'.put() - update': function () {
			var dfd = this.async();
			store.get(4).then(function (four) {
				four = Object.create(four);
				four.square = true;
				return store.put(four);
			}).then(function () {
				return store.get(4);
			}).then(dfd.callback(function (four) {
				assert.isTrue(four.square);
			}));
		},
		'.put() - new': function () {
			var dfd = this.async();
			store.put({
				id: 6,
				perfect: true
			}).then(function () {
				return store.get(6);
			}).then(dfd.callback(function (result) {
				assert.isTrue(result.perfect);
			}));
		},
		'.add() - duplicate': function () {
			var dfd = this.async();
			store.add({
				id: 6,
				perfect: true
			}).then(dfd.reject.bind(dfd), dfd.callback(function (error) {
				assert.instanceOf(error, StoreError);
			}));
		},
		'.add() - new': function () {
			var dfd = this.async();
			store.add({
				id: 7,
				prime: true
			}).then(function () {
				return store.get(7);
			}).then(dfd.callback(function (result) {
				assert.isTrue(result.prime);
			}), dfd.reject.bind(dfd));
		},
		'.add() - new with id assignment': function () {
			var dfd = this.async(),
				obj = { random: true };
			store.add(obj).then(dfd.callback(function () {
				assert(obj.id);
			}));
		},
		'.remove()': function () {
			var dfd = this.async();
			store.remove(7).then(function () {
				return store.get(7);
			}).then(dfd.callback(function (result) {
				assert.isUndefined(result);
			}), dfd.reject.bind(dfd));
		},
		'.remove() - missing': function () {
			var dfd = this.async();
			store.remove(77).then(dfd.reject.bind(dfd), function (error) {
				assert.instanceOf(error, StoreError);
				store.get(1).then(dfd.callback(function (result) {
					assert.equal(result.id, 1);
				}));
			});
		},
		'.query() - after changes': function () {
			var dfd = this.async(),
				promises = [];
			promises.push(store.query({ prime: true }));
			promises.push(store.query({ perfect: true }));
			all(promises).then(dfd.callback(function (results) {
				assert.equal(results[0].length, 3);
				assert.equal(results[1].length, 1);
			}));
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
			}
		}
	});
});