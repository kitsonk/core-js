define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/properties'
], function (registerSuite, assert, observableProperties) {

	var installObservableProperty = observableProperties.installObservableProperty,
		uninstallObservableProperty = observableProperties.uninstallObservableProperty,
		getDescriptor = Object.getOwnPropertyDescriptor,
		three = [ 3 ],
		four = function () {},
		seven = { seven: 7 },
		eleven = 11,
		thirteen,
		obj = {
			one: 'one',
			two: 2,
			three: three,
			four: four,
			five: undefined,
			six: null,
			seven: seven
		},
		desc,
		keys = [ 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
			'thirteen' ],
		originalDescriptors = {};

	registerSuite({
		name: 'core/observe/observableProperties',
		'.installObservableProperty()': function () {
			Object.defineProperties(obj, {
				eight: {
					value: 8,
					configurable: true
				},
				nine: {
					value: 9,
					enumerable: true,
					configurable: true
				},
				ten: {
					value: 10,
					writable: true,
					configurable: true
				},
				eleven: {
					get: function () {
						return eleven;
					},
					set: function (value) {
						eleven = value;
					},
					enumerable: true,
					configurable: true
				},
				twelve: {
					get: function () {
						return 12;
					},
					enumerable: true,
					configurable: true
				},
				thirteen: {
					set: function (value) {
						thirteen = value;
					},
					enumerable: true,
					configurable: true
				}
			});

			keys.forEach(function (key) {
				originalDescriptors[key] = getDescriptor(obj, key);
			});

			installObservableProperty(obj, 'one');
			desc = getDescriptor(obj, 'one');
			assert.isFunction(desc.get);
			assert.isFunction(desc.set);
			assert.isTrue(desc.enumerable);
			assert.isTrue(desc.configurable);
			assert.equal(obj.one, 'one');
			assert.typeOf(obj.one, 'string');
			obj.one = 'uno';
			assert.equal(obj.one, 'uno');
			obj.one = 'one';

			installObservableProperty(obj, 'two');
			assert.equal(obj.two, 2);
			assert.typeOf(obj.two, 'number');
			obj.two = 'two';
			assert.equal(obj.two, 'two');
			obj.two = 2;

			installObservableProperty(obj, 'three');
			assert.equal(obj.three, three);
			assert.equal(typeof obj.three, 'object');
			assert.isArray(obj.three);
			obj.three = 'three';
			assert.equal(obj.three, 'three');
			obj.three = three;

			installObservableProperty(obj, 'four');
			assert.equal(obj.four, four);
			assert.equal(typeof obj.four, 'function');
			obj.four();
			obj.four = 'four';
			assert.equal(obj.four, 'four');
			obj.four = four;

			installObservableProperty(obj, 'five');
			assert.isUndefined(obj.five);
			obj.five = 'five';
			assert.equal(obj.five, 'five');
			obj.five = undefined;

			installObservableProperty(obj, 'six');
			assert.isNull(obj.six);
			obj.six = 'six';
			assert.equal(obj.six, 'six');
			obj.six = null;

			installObservableProperty(obj, 'seven');
			assert.equal(obj.seven, seven);
			obj.seven = 'seven';
			assert.equal(obj.seven, 'seven');
			obj.seven = seven;

			installObservableProperty(obj, 'eight');
			desc = getDescriptor(obj, 'eight');
			assert.deepEqual(desc, { value: 8, writable: false, enumerable: false, configurable: true });

			installObservableProperty(obj, 'nine');
			desc = getDescriptor(obj, 'nine');
			assert.deepEqual(desc, { value: 9, writable: false, enumerable: true, configurable: true });

			installObservableProperty(obj, 'ten');
			desc = getDescriptor(obj, 'ten');
			assert.isFunction(desc.get);
			assert.isFunction(desc.set);
			assert.isTrue(desc.configurable);
			assert.isFalse(desc.enumerable);

			installObservableProperty(obj, 'eleven');
			desc = getDescriptor(obj, 'eleven');
			assert.isFunction(desc.get);
			assert.isFunction(desc.set);
			assert.isTrue(desc.enumerable);
			assert.isTrue(desc.configurable);
			assert.equal(obj.eleven, 11);
			obj.eleven = 'eleven';
			assert.equal(obj.eleven, 'eleven');

			installObservableProperty(obj, 'twelve');
			desc = getDescriptor(obj, 'twelve');
			assert.isFunction(desc.get);
			assert.isUndefined(desc.set);
			obj.twelve = 'foo';
			assert.equal(obj.twelve, 12);

			installObservableProperty(obj, 'thirteen');
			desc = getDescriptor(obj, 'thirteen');
			assert.isFunction(desc.set);
			assert.isUndefined(desc.get);
			obj.thirteen = 'thirteen';
			assert.isUndefined(obj.thirteen);
			assert.equal(thirteen, 'thirteen');
		},
		'.uninstallObservableProperty()': function () {
			keys.forEach(function (key) {
				uninstallObservableProperty(obj, key);
				desc = getDescriptor(obj, key);
				assert.deepEqual(originalDescriptors[key], desc);
			});
			uninstallObservableProperty(obj, 'foo');
			assert.isUndefined(obj.foo);
		},
		'.getNotifier()': function () {
			var obj2 = {},
				notifier = observableProperties.getNotifier(obj2);

			assert.strictEqual(obj2, notifier.target);
			var notifier2 = observableProperties.getNotifier(obj2);
			assert.strictEqual(notifier, notifier2);
		},
		'.createChangeRecord()': function () {
			var target = {},
				changeRecord = observableProperties.createChangeRecord('add', target, 'foo'),
				changeRecord2 = observableProperties.createChangeRecord('delete', target, 'foo', 'bar');

			assert.deepEqual(changeRecord, { type: 'add', object: target, name: 'foo' });
			assert.deepEqual(changeRecord2, { type: 'delete', object: target, name: 'foo', oldValue: 'bar' });
		},
		'.createSpliceChangeRecord()': function () {
			var target = [],
				spliceChangeRecord = observableProperties.createSpliceChangeRecord(target, 0, 1, 1);

			assert.deepEqual(spliceChangeRecord, {
				type: 'splice',
				object: target,
				index: 0,
				removed: 1,
				addedCount: 1
			});
		},
		'.defineObservableProperty()': function () {
			var foo = {},
				handle = observableProperties.defineObservableProperty(foo, 'bar', {
					value: 1,
					writable: true,
					configurable: true
				});

			assert.equal(foo.bar, 1);
			desc = getDescriptor(foo, 'bar');
			assert.isFunction(desc.set);
			assert.isFunction(desc.get);
			handle.remove();
			desc = getDescriptor(foo, 'bar');
			assert.equal(desc.value, 1);
		},
		'.defineObservableProperties()': function () {
			var foo = {},
				handle = observableProperties.defineObservableProperties(foo, {
					bar: {
						value: 1,
						writable: true,
						configurable: true
					},
					baz: {
						value: 'qat',
						writable: true,
						configurable: true
					}
				});

			assert.equal(foo.bar, 1);
			assert.equal(foo.baz, 'qat');
			desc = getDescriptor(foo, 'baz');
			assert.isFunction(desc.set);
			handle.remove();
			desc = getDescriptor(foo, 'baz');
			assert.equal(desc.value, 'qat');
		},
		'.removeObservableProperty()': function () {
			var foo = {};

			observableProperties.defineObservableProperty(foo, 'bar', {
				value: 1,
				writable: true,
				configurable: true
			});

			assert(getDescriptor(foo, 'bar'));
			observableProperties.removeObservableProperty(foo, 'bar');
			assert.isUndefined(getDescriptor(foo, 'bar'));
		},
		'.removeObservableProperties()': function () {
			var foo = {};

			observableProperties.defineObservableProperties(foo, {
				bar: {
					value: 1,
					writable: true,
					configurable: true
				},
				baz: {
					value: 'qat',
					writable: true,
					configurable: true
				}
			});

			assert(getDescriptor(foo, 'baz'));
			observableProperties.removeObservableProperties(foo, [ 'bar', 'baz' ]);
			assert.isUndefined(getDescriptor(foo, 'baz'));
		}
	});
});