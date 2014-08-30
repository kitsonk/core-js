define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/observe',
	'../../../observe/has',
	'../../../observe/properties'
], function (registerSuite, assert, observe, has, observableProperties) {

	registerSuite({
		name: 'core/observe/observe',
		'basic': function () {
			var dfd = this.async();

			var obj = {
				foo: 'bar',
				bar: 0
			};

			var callback = dfd.callback(function (changeRecords) {
				assert.strictEqual(6, changeRecords.length);
				assert.strictEqual('foo', changeRecords[0].name);
				assert.strictEqual(obj, changeRecords[0].object);
				assert.strictEqual('update', changeRecords[0].type);
				assert.strictEqual('bar', changeRecords[0].oldValue);
				assert.strictEqual('bar', changeRecords[5].name);
				assert.strictEqual(obj, changeRecords[5].object);
				assert.strictEqual('update', changeRecords[5].type);
				assert.strictEqual(2, changeRecords[5].oldValue);
			});

			var handle = observe(obj, callback);

			assert.deepEqual(['foo', 'bar'], Object.keys(obj), 'enumerability preserved');
			obj.foo = 'qat';
			obj.bar = 1;
			obj.foo = 'foo';
			obj.bar = 2;
			obj.foo = 'bar';
			obj.bar = 0;
			assert.strictEqual('bar', obj.foo);
			assert.strictEqual(0, obj.bar);

			handle.remove();
			obj.foo = 'qat';
			obj.bar = 4;
		},
		'array': function () {
			var dfd = this.async();

			var arr = [];

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(16, changeRecords.length);
				assert.equal('add', changeRecords[0].type);
				assert.equal(0, changeRecords[0].name);
				assert.equal('update', changeRecords[1].type);
				assert.equal('length', changeRecords[1].name);
				assert.equal(0, changeRecords[1].oldValue);
				assert.equal('delete', changeRecords[14].type);
				assert.equal(2, changeRecords[14].name);
				assert.equal(3, changeRecords[14].oldValue);
				assert.equal('update', changeRecords[15].type);
				assert.equal('length', changeRecords[15].name);
				assert.equal(3, changeRecords[15].oldValue);
			});

			assert.isFalse('get' in arr);
			assert.isFalse('set' in arr);

			observe(arr, callback);

			assert.isTrue('get' in arr);
			assert.isTrue('set' in arr);

			arr.push(1);
			assert.strictEqual(1, arr.pop(), 'should return last element');
			arr.push(2);
			arr.push(3);
			arr.unshift(1);
			assert.strictEqual(1, arr.shift(), 'should return first element');
		},
		'splice': function () {
			var dfd = this.async();

			var arr = [];

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 4);
				assert.equal(changeRecords[0].addedCount, 1);
				assert.equal(changeRecords[0].removed.length, 0);
				assert.equal(changeRecords[0].type, 'splice');
				assert.equal(changeRecords[3].addedCount, 1);
				assert.equal(changeRecords[3].type, 'splice');
			});

			observe(arr, callback, undefined, undefined, [ 'splice' ]);

			arr.push(1);
			assert.equal(arr.pop(), 1);
			arr.push(2, 3);
			arr.unshift(1);
			assert.deepEqual(arr, [ 1, 2, 3 ]);
		},
		'splice/sort': function () {
			var dfd = this.async();

			var arr = [ 4, 3, 1, 5, 2 ];

			var callback = dfd.callback(function (changeRecords) {
				if (has('es7-object-observe')) {
					assert.equal(changeRecords.length, 9);
				}
				else {
					assert.equal(changeRecords.length, 5);
				}
				assert.deepEqual(arr, [ 1, 2, 3, 4, 5 ]);
			});

			observe(arr, callback, undefined, undefined, [ 'add', 'delete', 'update', 'splice' ]);

			arr.sort();
		},
		'deep': function () {
			var dfd = this.async();

			var obj = {
				foo: 'bar',
				bar: {
					baz: 1
				}
			};

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 2);
				assert.deepEqual(changeRecords[0].name, 'foo');
				assert.deepEqual(changeRecords[0].type, 'update');
				assert.deepEqual(changeRecords[1].name, 'baz');
				assert.deepEqual(changeRecords[1].type, 'update');
			});

			var handle = observe(obj, callback, true);

			obj.foo = 'qat';
			obj.bar.baz = 3;

			handle.remove();

			obj.foo = 'bar';
			obj.bar.baz = 2;
		},
		'deep - array': function () {
			var dfd = this.async();

			var array = [ { foo: 'bar' }, { bar: 1 } ];

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 2);
				assert.deepEqual(changeRecords[0].name, 'foo');
				assert.deepEqual(changeRecords[0].type, 'update');
				assert.deepEqual(changeRecords[1].name, 'bar');
				assert.deepEqual(changeRecords[1].type, 'update');
			});

			var handle = observe(array, callback, true);

			array[0].foo = 'qat';
			array[1].bar = 2;

			handle.remove();

			array[0].foo = 'bar';
			array[1].bar = 1;
		},
		'properties - array': function () {
			var dfd = this.async();

			var obj = {
				foo: 'bar',
				bar: 0,
				baz: 'baz'
			};

			var callback = dfd.callback(function (changeRecords) {
				if (!has('es7-object-observe')) {
					assert.equal(changeRecords.length, 2);
					assert.equal(changeRecords[0].name, 'foo');
					assert.equal(changeRecords[1].name, 'baz');
				}
				else {
					assert.equal(changeRecords.length, 3);
				}
			});

			observe(obj, callback, false, [ 'foo', 'baz' ]);

			obj.foo = 'qat';
			obj.bar = 1;
			obj.baz = 'foo';
		},
		'properties - string': function () {
			var dfd = this.async();

			var obj = {
				foo: 'bar',
				bar: 0,
				baz: 'baz'
			};

			var callback = dfd.callback(function (changeRecords) {
				if (!has('es7-object-observe')) {
					assert.equal(changeRecords.length, 2);
					assert.equal(changeRecords[0].name, 'foo');
					assert.equal(changeRecords[1].name, 'baz');
				}
				else {
					assert.equal(changeRecords.length, 3);
				}
			});

			observe(obj, callback, false, 'foo baz');

			obj.foo = 'qat';
			obj.bar = 1;
			obj.baz = 'foo';
		},
		'properties - invalid': function () {
			assert.throws(function () {
				observe({}, function () {}, false, {});
			}, TypeError);
		},
		'accept': function () {
			var dfd = this.async();

			var obj = {
				foo: 'bar',
				baz: 0
			};

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 1);
				assert.equal(changeRecords[0].name, 'baz');
				assert.equal(changeRecords[0].type, 'delete');
			});

			observe(obj, callback, false, false, [ 'delete' ]);

			obj.foo = 'bar';
			obj.baz = 1;
			observableProperties.removeObservableProperty(obj, 'baz');
		}
	});
});