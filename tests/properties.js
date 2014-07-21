define([
	'intern!object',
	'intern/chai!assert',
	'../properties'
], function (registerSuite, assert, properties) {
	registerSuite({
		name: 'core/properties',
		'basic': function () {
			assert(properties);
			assert(properties.getDescriptor);
			assert(properties.isAccessorDescriptor);
			assert(properties.isDataDescriptor);
			assert(properties.remove);
			assert(properties.defineValueProperty);
			assert(properties.defineReadOnlyProperty);
			assert(properties.definePseudoPrivateProperty);
			assert(properties.defineHiddenProperty);
			assert(properties.getValueDescriptor);
			assert(properties.getReadOnlyDescriptor);
			assert(properties.getPseudoPrivateDescriptor);
			assert(properties.getHiddenDescriptor);
		},
		'.getDescriptor()': function () {
			function Class() {}
			Object.defineProperties(Class.prototype, {
				foo: { value: 'bar' },
				bar: { value: 'baz', writable: true, configurable: true }
			});
			var c = new Class();
			assert.isTrue(properties.getDescriptor(c, 'toString').writable);
			assert.deepEqual(properties.getDescriptor(c, 'foo'), {
				value: 'bar',
				enumerable: false,
				writable: false,
				configurable: false
			});
			c.foo = 'baz';
			c.bar = 'foo';
			assert.deepEqual(properties.getDescriptor(c, 'foo'), {
				value: 'bar',
				enumerable: false,
				writable: false,
				configurable: false
			});
			assert.deepEqual(properties.getDescriptor(c, 'bar'), {
				value: 'foo',
				enumerable: true,
				writable: true,
				configurable: true
			});
			assert.isUndefined(properties.getDescriptor(c, 'baz'));
		},
		'.isAccessorDescriptor()/.isDataDescriptor()': function () {
			var value,
				obj = {};

			Object.defineProperties(obj, {
				foo: {
					get: function () { return value; },
					set: function (v) { value = v; },
					enumerable: true,
					configurable: true
				},
				bar: { value: 'baz', enumerable: true, writable: true, configurable: true }
			});

			assert.isTrue(properties.isAccessorDescriptor(properties.getDescriptor(obj, 'foo')));
			assert.isFalse(properties.isAccessorDescriptor(properties.getDescriptor(obj, 'bar')));
			assert.isFalse(properties.isDataDescriptor(properties.getDescriptor(obj, 'foo')));
			assert.isTrue(properties.isDataDescriptor(properties.getDescriptor(obj, 'bar')));
		},
		'.remove()': function () {
			function Class() {}
			Class.prototype = {
				foo: 'bar'
			};
			var c = new Class();
			assert.equal(c.foo, 'bar');
			c.foo = 'baz';
			assert.equal(c.foo, 'baz');
			delete c.foo;
			assert.equal(c.foo, 'bar');
			properties.remove(c, 'foo');
			assert.isUndefined(c.foo);
		},
		'.defineValueProperty()': function () {
			var obj = {};
			properties.defineValueProperty(obj, 'foo', 'bar');
			assert.equal(obj.foo, 'bar');
			assert.equal(Object.keys(obj).length, 1);
			obj.foo = 'baz';
			assert.equal(obj.foo, 'baz');
		},
		'.defineReadOnlyProperty()': function () {
			var obj = {};
			properties.defineReadOnlyProperty(obj, 'foo', 'bar');
			assert.equal(obj.foo, 'bar');
			assert.equal(Object.keys(obj).length, 1);
			obj.foo = 'baz';
			assert.equal(obj.foo, 'bar');
		},
		'.definePseudoPrivateProperty()': function () {
			var obj = {};
			properties.defineHiddenProperty(obj, '_foo', 'bar');
			assert.equal(obj._foo, 'bar');
			assert.equal(Object.keys(obj).length, 0);
		},
		'.defineHiddenProperty()': function () {
			var obj = {};
			properties.defineHiddenProperty(obj, 'foo', 'bar');
			assert.equal(obj.foo, 'bar');
			assert.equal(Object.keys(obj).length, 0);
			obj.foo = 'baz';
			assert.equal(obj.foo, 'baz');
		},
		'.getValueDescriptor()': function () {
			assert.deepEqual(properties.getValueDescriptor('foo'), {
				value: 'foo',
				enumerable: true,
				writable: true,
				configurable: true
			});
		},
		'.getReadOnlyDescriptor()': function () {
			assert.deepEqual(properties.getReadOnlyDescriptor('foo'), {
				value: 'foo',
				enumerable: true,
				configurable: true
			});
		},
		'.getPseudoPrivateDescriptor()': function () {
			assert.deepEqual(properties.getPseudoPrivateDescriptor('foo'), {
				value: 'foo',
				configurable: true
			});
		},
		'.getHiddenDescriptor()': function () {
			assert.deepEqual(properties.getHiddenDescriptor('foo'), {
				value: 'foo',
				writable: true,
				configurable: true
			});
		}
	});
});