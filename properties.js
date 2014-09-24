define([
], function () {
	'use strict';

	var hasOwnProp = Object.prototype.hasOwnProperty,
		getPrototypeOf = Object.getPrototypeOf,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		defineProperty = Object.defineProperty;

	var getValueDescriptor = function (value) {
		return {
			value: value,
			enumerable: true,
			writable: true,
			configurable: true
		};
	};

	var getReadOnlyDescriptor = function (value) {
		return {
			value: value,
			enumerable: true,
			configurable: true
		};
	};

	var getPseudoPrivateDescriptor = function (value) {
		return {
			value: value,
			configurable: true
		};
	};

	var getHiddenAccessorDescriptor = function (get, set) {
		return {
			get: get,
			set: set,
			configurable: true
		};
	};

	var getHiddenDescriptor = function (value) {
		return {
			value: value,
			writable: true,
			configurable: true
		};
	};

	return {
		/**
		 * Returns a property descriptor from an object for the supplied property name.
		 *
		 * Ascends the prototype of the object until it can find the property descriptor for the object, returning
		 * `undefined` if not found within its inheritance chain.
		 * @param  {Object} obj  The object that should be inspected for property descriptor
		 * @param  {String} name The name of the property to find a property descriptor for
		 * @return {Object}      The descriptor if found
		 */
		getDescriptor: function (obj, name) {
			while (obj && !hasOwnProp.call(obj, name)) {
				obj = getPrototypeOf(obj);
			}
			return obj ? getOwnPropertyDescriptor(obj, name) : undefined;
		},

		/**
		 * Returns `true` if the provided descriptor is a data descriptor, otherwise `false`
		 * @param  {Object}  descriptor The descriptor to inspect
		 * @return {Boolean}            If the supplied descriptor is a data descriptor
		 */
		isAccessorDescriptor: function (descriptor) {
			return descriptor ? 'get' in descriptor || 'set' in descriptor : false;
		},

		/**
		 * Returns `true` if the provided descriptor is an accessor descriptor, otherwise `false`
		 * @param  {Object}  descriptor The descriptor to inspect
		 * @return {Boolean}            If the supplied descriptor is an accessor descriptor
		 */
		isDataDescriptor: function (descriptor) {
			return descriptor ? 'value' in descriptor || 'writable' in descriptor : false;
		},

		/**
		 * Removes a property, including from its inheritance chain.
		 *
		 * Ascends the prototype of the object, deleting any occurrences of the named property.  This is useful when
		 * wanting to ensure that if a configurable property is defined somewhere in the inheritance chain, it does not
		 * get persisted when using the object as a prototype for another object.
		 * @param  {Object} obj  The object that should be deleted from
		 * @param  {String} name The name of the property to remove
		 */
		remove: function (obj, name) {
			do {
				if (obj && hasOwnProp.call(obj, name)) {
					delete obj[name];
				}
			}
			while ((obj = getPrototypeOf(obj)));
		},

		/**
		 * Creates a normal "value" property with the supplied value
		 * @param  {Object} obj   The object that the property should be created on
		 * @param  {String} name  The name of the property
		 * @param  {Any}    value The value of the property
		 * @return {Any}          The value that was set
		 */
		defineValueProperty: function (obj, name, value) {
			defineProperty(obj, name, getValueDescriptor(value));
			return value;
		},

		/**
		 * Creates a read only property, with a supplied value
		 * @param  {Object} obj   The object that the property should be created on
		 * @param  {String} name  The name of the property
		 * @param  {Any}    value The value of the property
		 * @return {Any}          The value that was set
		 */
		defineReadOnlyProperty: function (obj, name, value) {
			defineProperty(obj, name, getReadOnlyDescriptor(value));
			return value;
		},

		/**
		 * Creates a pseudo private property, with a supplied value
		 * @param  {Object} obj   The object that the property should be created on
		 * @param  {String} name  The name of the property
		 * @param  {Any}    value The value of the property
		 * @return {Any}          The value that was set
		 */
		definePseudoPrivateProperty: function (obj, name, value) {
			defineProperty(obj, name, getPseudoPrivateDescriptor(value));
			return value;
		},

		/**
		 * Creates a hidden (non-enumerable) property, with a supplied value
		 * @param  {Object} obj   The object that the property should be created on
		 * @param  {String} name  The name of the property
		 * @param  {Any}    value The value of the property
		 * @return {Any}          The value that was set
		 */
		defineHiddenProperty: function (obj, name, value) {
			defineProperty(obj, name, getHiddenDescriptor(value));
			return value;
		},

		/**
		 * Returns a "normal" value property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		getValueDescriptor: getValueDescriptor,

		/**
		 * Returns a read only property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		getReadOnlyDescriptor: getReadOnlyDescriptor,

		/**
		 * Returns a read only, non-enumerable property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		getPseudoPrivateDescriptor: getPseudoPrivateDescriptor,

		/**
		 * Returns a non-enumerable property descriptor
		 * @param  {Function} get The `get` accessor function
		 * @param  {Function} set The `set` accessor function
		 * @return {Object}       The property descriptor
		 */
		getHiddenAccessorDescriptor: getHiddenAccessorDescriptor,

		/**
		 * Return a 'hidden' value property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		getHiddenDescriptor: getHiddenDescriptor
	};

});