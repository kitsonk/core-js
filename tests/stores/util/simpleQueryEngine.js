define([
	'intern!object',
	'intern/chai!assert',
	'../../../stores/util/simpleQueryEngine'
], function (registerSuite, assert, simpleQueryEngine) {
	var data;

	registerSuite({
		name: 'core/stores/util/simpleQueryEngine',
		beforeEach: function () {
			data = [
				{ id: 1, even: false, name: 'one', other: 6 },
				{ id: 2, even: true, name: 'two', other: 2 },
				{ id: 3, even: false, name: 'three', other: 1 },
				{ id: 4, even: true, name: 'four', other: 5 },
				{ id: 5, even: false, name: 'five', other: 4 },
				{ id: 6, even: true, name: 'six', other: 3 }
			];
		},
		'object query': function () {
			var query = simpleQueryEngine({ even: true }),
				results = query(data);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 2);
		},
		'object query test': function () {
			var query = simpleQueryEngine({ name: { test: function (value) { return !!~value.indexOf('o'); } } }),
				results = query(data);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 1);
		},
		'function query test': function () {
			var query = simpleQueryEngine(function (value) {
					return value && value.even;
				}),
				results = query(data);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 2);
		},
		'string query test': function () {
			var query = simpleQueryEngine.call({ matches: function (value) {
					return value && !value.even;
				} }, 'matches'),
				results = query(data);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 1);
		},
		'query all': function () {
			var query = simpleQueryEngine(),
				results = query(data);
			assert.equal(results.length, 6);
			assert.equal(results[5].id, 6);
		},
		'does throw': function () {
			assert.throws(function () {
				simpleQueryEngine(99);
			});
		},
		'sorting function': function () {
			var query = simpleQueryEngine({ even: true }, { sort: function (a, b) {
					return a.other > b.other;
				}}),
				results = query(data);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 2);
			assert.equal(results[1].id, 6);
		},
		'sorting object': function () {
			var query = simpleQueryEngine({ even: true }, { sort: [ { attribute: 'other' } ] }),
				results = query(data);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 2);
			assert.equal(results[1].id, 6);
		},
		'sorting object descending': function () {
			var query = simpleQueryEngine({ even: true }, { sort: [ { attribute: 'other', descending: true } ] }),
				results = query(data);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 4);
			assert.equal(results[1].id, 6);
		},
		'paging - start': function () {
			var query = simpleQueryEngine(undefined, { start: 1 }),
				results = query(data);
			assert.equal(results.total, 6);
			assert.equal(results.length, 5);
			assert.equal(results[0].id, 2);
		},
		'paging - count': function () {
			var query = simpleQueryEngine(undefined, { count: 3 }),
				results = query(data);
			assert.equal(results.total, 6);
			assert.equal(results.length, 3);
			assert.equal(results[2].id, 3);
		},
		'paging - start and count': function () {
			var query = simpleQueryEngine(undefined, { start: 1, count: 3 }),
				results = query(data);
			assert.equal(results.total, 6);
			assert.equal(results.length, 3);
			assert.equal(results[0].id, 2);
		}
	});
});