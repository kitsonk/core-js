define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/Observable'
], function (registerSuite, assert, Observable) {
	registerSuite({
		name: 'core/observe/Observable',
		'api': function () {
			assert.isFunction(Observable.defineProperty);
			assert.isFunction(Observable.defineProperties);
			assert.isFunction(Observable.removeProperty);
			assert.isFunction(Observable.removeProperties);
		},
		'construction': function () {
			var observable = new Observable({ foo: 'bar' });

			assert.instanceOf(observable, Observable);
			assert.equal(observable.foo, 'bar');
			assert.isFunction(observable.observe);
			assert.isFunction(observable.summary);
			assert.isFunction(observable.path);
			assert.deepEqual(Object.keys(observable), [ 'foo' ]);
		},
		'.observe()': function () {
			var dfd = this.async();

			var observable = new Observable({ foo: 'bar', bar: 3 });

			var callback = dfd.callback(function (changeRecords) {
				assert.equal(changeRecords.length, 4);
				assert.equal(changeRecords[0].name, 'foo');
				assert.equal(changeRecords[0].type, 'update');
				assert.equal(changeRecords[1].type, 'add');
				assert.equal(changeRecords[2].type, 'update');
				assert.equal(changeRecords[3].type, 'delete');
				assert.deepEqual(Object.keys(observable), [ 'foo', 'baz' ]);
				assert.strictEqual(changeRecords[0].object, observable);
			});

			var handle = observable.observe(callback);

			observable.foo = 'qat';
			Observable.defineProperty(observable, 'baz', {
				value: 4,
				enumerable: true,
				writable: true,
				configurable: true
			});
			observable.baz = 3;
			Observable.removeProperty(observable, 'bar');

			handle.remove();

			observable.foo = 3;
			observable.baz = 'foo';
		},
		'.summary()': function () {
			var dfd = this.async();

			var observable = new Observable({ foo: 'bar', bar: 3 });

			var callback = dfd.callback(function (added, removed, changed, oldValueFn) {
				assert.equal(added.baz, 3);
				assert.equal(Object.keys(added).length, 1);
				assert.equal(Object.keys(removed).length, 1);
				assert.equal(Object.keys(removed)[0], 'bar');
				assert.equal(oldValueFn('bar'), 3);
				assert.equal(Object.keys(changed).length, 1);
				assert.equal(changed.foo, 'qat');
			});

			var handle = observable.summary(callback);

			observable.foo = 'qat';
			Observable.defineProperty(observable, 'baz', {
				value: 4,
				enumerable: true,
				writable: true,
				configurable: true
			});
			observable.baz = 3;
			Observable.removeProperty(observable, 'bar');

			handle.remove();

			observable.foo = 3;
			observable.baz = 'foo';
		},
		'.path()': function () {
			var dfd = this.async();

			var observable = new Observable({ foo: { bar: { baz: 3 } }, qat: 1 });

			var callback = dfd.callback(function (newValue, oldValue) {
				assert.equal(newValue, 2);
				assert.equal(oldValue, 3);
			});

			observable.path('foo.bar.baz', callback);

			observable.qat = 9;

			observable.foo.bar.baz = 2;
		},
		'.defineProperty()': function () {
			var observable = new Observable();
			Observable.defineProperty(observable, 'foo', {
				value: 'bar',
				configurable: true
			});
			assert.equal(observable.foo, 'bar');
		},
		'.defineProperties()': function () {
			var observable = new Observable();
			Observable.defineProperties(observable, {
				foo: {
					value: 'bar',
					configurable: true
				},
				bar: {
					value: 1,
					configurable: true
				}
			});
			assert.strictEqual(observable.foo, 'bar');
			assert.strictEqual(observable.bar, 1);
		},
		'.removeProperty()': function () {
			var observable = new Observable({ foo: 'bar' });
			Observable.defineProperty(observable, 'bar', {
				value: 'qat',
				writable: true,
				enumerable: true,
				configurable: true
			});
			assert.deepEqual(Object.keys(observable), [ 'foo', 'bar' ]);
			Observable.removeProperty(observable, 'foo');
			Observable.removeProperty(observable, 'bar');
			assert.deepEqual(Object.keys(observable), []);
		},
		'.removeProperties()': function () {
			var observable = new Observable({ foo: 'bar' });
			Observable.defineProperty(observable, 'bar', {
				value: 'qat',
				writable: true,
				enumerable: true,
				configurable: true
			});
			assert.deepEqual(Object.keys(observable), [ 'foo', 'bar' ]);
			Observable.removeProperties(observable, [ 'foo', 'bar' ]);
			assert.deepEqual(Object.keys(observable), []);
		}
	});
});