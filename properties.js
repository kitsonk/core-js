define([
], function () {
	'use strict';

	var hasOwnProp = Object.prototype.hasOwnProperty,
		getPrototypeOf = Object.getPrototypeOf,
		getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
		defineProperty = Object.defineProperty;

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
		 * Creates a non-enumerable property with an appended `_` in front of the name.
		 * @param  {Object} obj   The object that the property should be created on
		 * @param  {String} name  The name of the property to be shadowed
		 * @param  {Mixed}  value The value of the property
		 * @return {Mixed}        The value that was set
		 */
		shadow: function (obj, name, value) {
			defineProperty(obj, '_' + name, {
				value: value,
				configurable: true
			});
			return value;
		},

		/**
		 * Creates a read only property, with a supplied value
		 * @param  {Object} obj   The object that the property should be created on
		 * @param  {String} name  The name of the property
		 * @param  {Mixed}  value The value of the property
		 * @return {Mixed}        The value that was set
		 */
		readOnly: function (obj, name, value) {
			defineProperty(obj, name, {
				value: value,
				enumerable: true,
				configurable: true
			});
			return value;
		},

		/**
		 * Creates a pseudo private property, with a supplied value
		 * @param  {Object} obj   The object that the property should be created on
		 * @param  {String} name  The name of the property
		 * @param  {Mixed}  value The value of the property
		 * @return {Mixed}        The value that was set
		 */
		pseudoPrivate: function (obj, name, value) {
			defineProperty(obj, name, {
				value: value,
				configurable: true
			});
			return value;
		},

		/**
		 * Returns a read only property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		readOnlyDescriptor: function (value) {
			return {
				value: value,
				enumerable: true,
				configurable: true
			};
		},

		/**
		 * Returns a read only, non-enumerable property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		hiddenReadOnlyDescriptor: function (value) {
			return {
				value: value,
				configurable: true
			};
		},

		/**
		 * Returns a "normal" value property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		valueDescriptor: function (value) {
			return {
				value: value,
				writable: true,
				enumerable: true,
				configurable: true
			};
		},

		/**
		 * Return a 'hidden' value property descriptor
		 * @param  {Any}    value The value of the property
		 * @return {Object}       The property descriptor
		 */
		hiddenDescriptor: function (value) {
			return {
				value: value,
				writable: true,
				configurable: true
			};
		}
	};

});