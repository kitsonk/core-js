define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/ObservableArray',
	'../../../observe/has'
], function (registerSuite, assert, ObservableArray, has) {
	registerSuite({
		name: 'core/observe/ObservableArray',
		'basic': function () {
			var dfd = this.async();

			var observableArray = new ObservableArray();

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 1);
				assert.equal(changeRecords[0].type, 'splice');
				assert.strictEqual(changeRecords[0].object, observableArray);
				assert.equal(changeRecords[0].index, 0);
				assert.deepEqual(changeRecords[0].removed, []);
			});

			observableArray.observe(callback);

			observableArray.push(1, 2, 3);

			assert.strictEqual(observableArray[0], 1);
			assert.strictEqual(observableArray[1], 2);
			assert.strictEqual(observableArray[2], 3);
		},
		'construction': function () {
			var observableArray1 = new ObservableArray(),
				observableArray2 = new ObservableArray(100),
				observableArray3 = new ObservableArray('100'),
				observableArray4 = new ObservableArray(1, 2);

			assert.equal(observableArray1.length, 0);
			assert.equal(observableArray2.length, 100);
			assert.equal(observableArray3.length, 1);
			assert.equal(observableArray4.length, 2);
			assert.equal(observableArray4[0], 1);
			assert.equal(observableArray4[1], 2);
		},
		'splice mutators': function () {
			var dfd = this.async();

			var observableArray = new ObservableArray();

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 5);
				assert.equal(changeRecords[0].type, 'splice');
				assert.equal(changeRecords[0].addedCount, 5);
				assert.equal(changeRecords[0].index, 0);
				assert.equal(changeRecords[0].removed.length, 0);
				assert.equal(changeRecords[1].type, 'splice');
				assert.equal(changeRecords[1].addedCount, 0);
				assert.equal(changeRecords[1].index, 4);
				assert.equal(changeRecords[1].removed.length, 1);
				assert.equal(changeRecords[2].type, 'splice');
				assert.equal(changeRecords[2].addedCount, 1);
				assert.equal(changeRecords[2].index, 0);
				assert.equal(changeRecords[2].removed.length, 0);
				assert.equal(changeRecords[3].type, 'splice');
				assert.equal(changeRecords[3].addedCount, 0);
				assert.equal(changeRecords[3].index, 0);
				assert.equal(changeRecords[3].removed.length, 1);
				assert.equal(changeRecords[4].type, 'splice');
				assert.equal(changeRecords[4].addedCount, 1);
				assert.equal(changeRecords[4].index, 2);
				assert.equal(changeRecords[4].removed.length, 1);
			});

			observableArray.observe(callback);

			observableArray.push(1, 2, 9, 4, 5);
			observableArray.pop();
			observableArray.unshift(0);
			observableArray.shift();
			observableArray.splice(2, 1, 3);
			assert.deepEqual(observableArray.toArray(), [ 1, 2, 3, 4 ]);
		},
		'sort': function () {
			var dfd = this.async();

			var observableArray = new ObservableArray(5, 6, 1, 4, 3, 2);

			var callback = dfd.callback(function (changeRecords) {
				if (has('es7-array-observe')) {
					/* Native observation generates a change record for every move in a "bubble sort" */
					assert.equal(changeRecords.length, 15);
				}
				else {
					/* Because we compare pre with post, we only record the changes */
					assert.equal(changeRecords.length, 5);
				}
				for (var i = 0, l = changeRecords.length; i < l; i++) {
					assert.equal(changeRecords[i].type, 'update');
				}
			});

			observableArray.observe(callback);

			observableArray.sort();
			assert.deepEqual(observableArray.toArray(), [ 1, 2, 3, 4, 5, 6 ]);
		},
		'reverse': function () {
			var dfd = this.async();

			var observableArray = new ObservableArray(1, 2, 3, 4);

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 4);
				for (var i = 0, l = changeRecords.length; i < l; i++) {
					assert.equal(changeRecords[i].type, 'update');
				}
			});

			observableArray.observe(callback);

			observableArray.reverse();
			assert.deepEqual(observableArray.toArray(), [ 4, 3, 2, 1 ]);
		},
		'fill': function () {
			if (!('fill' in Array.prototype)) {
				this.skip('Array.prototype.fill not supported');
			}
			var dfd = this.async();

			var observableArray = new ObservableArray(1, 1, 1, 1);

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 2);
				assert.equal(changeRecords[0].type, 'update');
				assert.equal(changeRecords[0].name, 2);
			});

			observableArray.observe(callback);

			observableArray.fill(2, 2);
			assert.deepEqual(observableArray.toArray(), [ 1, 1, 2, 2 ]);
		},
		'copyWithin': function () {
			if (!('copyWithin' in Array.prototype)) {
				this.skip('Array.prototype.copyWithin not supported');
			}
			var dfd = this.async();

			var observableArray = new ObservableArray(1, 2, 3, 4, 5);

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 2);
				assert.equal(changeRecords[0].type, 'update');
				assert.equal(changeRecords[0].name, 0);
			});

			observableArray.observe(callback);

			observableArray.copyWithin(0, 3);
			assert.deepEqual(observableArray.toArray(), [ 4, 5, 3, 4, 5 ]);
		},
		'length': function () {
			var dfd = this.async();

			var observableArray = new ObservableArray();

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 7);
				assert.equal(changeRecords[0].type, 'splice');
				assert.equal(changeRecords[0].addedCount, 1);
				assert.equal(changeRecords[0].index, 0);
				assert.equal(changeRecords[0].removed.length, 0);
				assert.equal(changeRecords[1].type, 'add');
				assert.equal(changeRecords[1].name, '0');
				assert.equal(changeRecords[2].type, 'splice');
				assert.equal(changeRecords[2].addedCount, 1);
				assert.equal(changeRecords[2].index, 1);
				assert.equal(changeRecords[2].removed.length, 0);
				assert.equal(changeRecords[3].type, 'splice');
				assert.equal(changeRecords[3].addedCount, 2);
				assert.equal(changeRecords[3].index, 2);
				assert.equal(changeRecords[3].removed.length, 0);
				assert.equal(changeRecords[4].type, 'add');
				assert.equal(changeRecords[4].name, '2');
				assert.equal(changeRecords[5].type, 'add');
				assert.equal(changeRecords[5].name, '3');
				assert.equal(changeRecords[6].type, 'splice');
				assert.equal(changeRecords[6].addedCount, 0);
				assert.equal(changeRecords[6].index, 2);
				assert.equal(changeRecords[6].removed.length, 2);
				assert.deepEqual(changeRecords[6].removed, [ 3, 4 ]);
			});

			observableArray.observe(callback);

			observableArray.length = 1;
			observableArray.set(0, 1);
			observableArray.set(1, 2);
			observableArray.length = 4;
			observableArray.set(2, 3);
			observableArray.set(3, 4);
			observableArray.length = 4;
			observableArray.length = 2;
		}
	});
});