define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/array'
], function (registerSuite, assert, observeArray) {
	
	registerSuite({
		name: 'core/observe/array',
		'basic': function () {
			var dfd = this.async();

			var arr = [ 1, 2, 3 ];

			var callback = dfd.callback(function (splices) {
				assert.strictEqual(2, splices.length);
				assert.strictEqual(3, splices[0].addedCount);
				assert.strictEqual(3, splices[0].index);
				assert.strictEqual(0, splices[0].removed.length);
				assert.strictEqual(0, splices[1].addedCount);
				assert.strictEqual(5, splices[1].index);
				assert.deepEqual([ 6 ], splices[1].removed);
				assert.deepEqual([ 1, 2, 3, 4, 5 ], arr);
			});

			var handle = observeArray(arr, callback);

			arr.push(4, 5, 6);
			assert.strictEqual(6, arr.pop());

			handle.remove();
			arr.push(6, 7, 8);
			arr.pop();
		},
		'throws': function () {
			assert.throws(function () {
				observeArray({}, function () {});
			}, TypeError);
		},
		'.splice()': function () {
			var dfd = this.async();

			var arr = [ 1, 2, 3 ];

			var callback = dfd.callback(function (splices) {
				assert.strictEqual(splices.length, 1);
				assert.strictEqual(splices[0].addedCount, 1);
				assert.strictEqual(splices[0].removed.length, 1);
				assert.deepEqual([ 1, 4, 3 ], arr);
			});

			observeArray(arr, callback);

			arr.splice(1, 1, 4);
		},
		'.unshift()/.shift()': function () {
			var dfd = this.async();

			var arr = [ 3, 4, 5 ];

			var callback = dfd.callback(function (splices) {
				assert.strictEqual(2, splices.length);
				assert.strictEqual(3, splices[0].addedCount);
				assert.strictEqual(0, splices[0].index);
				assert.strictEqual(0, splices[0].removed.length);
				assert.strictEqual(0, splices[1].addedCount);
				assert.strictEqual(0, splices[1].index);
				assert.deepEqual([ 0 ], splices[1].removed);
				assert.deepEqual([ 1, 2, 3, 4, 5 ], arr);
			});

			observeArray(arr, callback);

			arr.unshift(0, 1, 2);
			assert.strictEqual(arr.shift(), 0);
		},
		'.sort()': function () {
			var dfd = this.async();

			var arr = [ 4, 3, 1, 5, 2 ];

			var callback = dfd.callback(function (splices) {
				console.log(splices);
				var origin = [ 4, 3, 1, 5, 2 ];
				observeArray.applySplices(origin, arr, splices);
				console.log(origin, arr);
			});

			observeArray(arr, callback);

			arr.sort();
		},
		'.applySplices()': function () {
			var origin = [ 1, 2, 3 ],
				arr = [ 1, 2, 3, 4, 5 ],
				splices = [
					{ addedCount: 3, index: 3, removed: [] },
					{ addedCount: 0, index: 5, removed: [ 6 ]}
				];

			observeArray.applySplices(origin, arr, splices);

			assert.deepEqual(origin, arr);
		}
	});
});