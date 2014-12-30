define([
	'../WeakMap',
	'./has',
	'./arrayUtil',
	'./observe',
	'./has!es7-array-observe?:./properties',
	'../properties'
], function (WeakMap, has, arrayUtil, observe, observableProperties, properties) {
	'use strict';

	/**
	 * This module is designed to provide a "subclassed" Array that supports observation.  Subclassing arrays in
	 * JavaScript is quite difficult, but this generally supports all the features of a native JavaScript Array.
	 * One items that it does not support is "array detection" via Array.isArray().
	 * 
	 * @module core/observe/ObservableArray
	 */

	var defineProperties = Object.defineProperties,
		defineProperty = Object.defineProperty,
		getNotifier = observableProperties ? observableProperties.getNotifier : Object.getNotifier,
		getPseudoPrivateDescriptor = properties.getPseudoPrivateDescriptor,
		getHiddenAccessorDescriptor = properties.getHiddenAccessorDescriptor,
		calcObjectChangeRecords = arrayUtil.calcObjectChangeRecords,
		calcSpliceRecords = arrayUtil.calcSpliceRecords;

	var prototype = Object.create(Array.prototype),
		slice = prototype.slice,
		MAX_SIGNED_INT_VALUE = Math.pow(2, 32) - 1,
		hasOwnProperty = Object.prototype.hasOwnProperty,
		lengths = new WeakMap(),
		isMutating = new WeakMap();

	function arrayObserve() {
		var args = slice.call(arguments, 0);
		if (typeof args[3] === 'undefined') {
			args[3] = [ 'add', 'update', 'delete', 'splice' ];
		}
		args.unshift(this);
		return observe.apply(this, args);
	}

	function arrayGet(idx) {
		return this[idx];
	}

	function arraySet(idx, value) {
		if (idx >= this.length) {
			this.splice(idx, 0, value);
		}
		else {
			this[idx] = value;
		}
	}

	function arrayToString() {
		return '[object ObservableArray]';
	}

	function observableArraytoArray() {
		return this.slice(0);
	}

	function toInt32(value) {
		return value >>> 0;
	}

	function getMaxIndexProperty(object) {
		var maxIndex = -1,
			isValidProperty;

		for (var prop in object) {
			isValidProperty = (String(toInt32(prop)) === prop && toInt32(prop) !== MAX_SIGNED_INT_VALUE &&
				hasOwnProperty.call(object, prop));

			if (isValidProperty && prop > maxIndex) {
				maxIndex = prop;
			}
		}

		return maxIndex;
	}

	function getArrayLength() {
		var maxIndexProperty = +getMaxIndexProperty(this);
		return Math.max(lengths.get(this), maxIndexProperty + 1);
	}

	function setArrayLength(value) {
		var constrainedValue = toInt32(value),
			currentLength = this.length;
		if (constrainedValue !== +value) {
			throw new RangeError();
		}
		if (!isMutating.get(this) && constrainedValue < currentLength) {
			isMutating.set(this, true);
			this.splice(constrainedValue, currentLength - constrainedValue);
			isMutating.set(this, false);
		}
		lengths.set(this, constrainedValue);
	}

	/**
	 * Because we are supporting both native ES7 Observation and non-native observation, we have to create the
	 * prototype in two different ways.  First we will create the prototype if we are supporting native observation.
	 * We add the convenience functions of .set and .get (because it is not practical to support direct element
	 * wrapping for non-native observation).  We also add the convenience function of `.observe()` and `.toArray()` as
	 * well a replicate the `.length` functionality which is supported when you subclass Arrays and finally provide an
	 * appropriate `.toString()`.
	 */
	if (has('es7-array-observe')) {

		var wrapES7ArrayLength = function (fn) {

			return function () {
				var notifier = getNotifier(this),
					notify = notifier.notify;

				var old = this.slice(0),
					result = fn.apply(this, arguments),
					spliceRecord;

				if (this.length > old.length) {
					spliceRecord = calcSpliceRecords(old, this, 'length', slice.call(arguments, 0));
				}

				if (spliceRecord) {
					notify.call(notifier, spliceRecord, true);
				}

				return result;
			};
		};

		defineProperties(prototype, {
			get: getPseudoPrivateDescriptor(arrayGet),
			set: getPseudoPrivateDescriptor(arraySet),
			observe: getPseudoPrivateDescriptor(arrayObserve),
			length: getHiddenAccessorDescriptor(getArrayLength, wrapES7ArrayLength(setArrayLength)),
			toArray: getPseudoPrivateDescriptor(observableArraytoArray),
			toString: getPseudoPrivateDescriptor(arrayToString)
		});
	}
	/**
	 * If we are supporting non-native observation, then we have a bit more work to do.  The API matches, but we have
	 * to properly wrap all the mutators so that we "trap" any changes to the array.
	 */
	else {
		var getDescriptor = properties.getDescriptor,
			descriptor;
		
		var wrapMethod = function (method, fn) {

			return function () {
				if (isMutating.get(this)) {
					return fn.apply(this, arguments);
				}
				var notifier = getNotifier(this),
					notify = notifier.notify,
					i;

				var old = this.slice(0),
					result = fn.apply(this, arguments),
					changeRecords;

				if (!(method === 'set' && this.length > old.length)) {
					changeRecords = calcObjectChangeRecords(old, this);
					for (i = 0; i < changeRecords.length; i++) {
						notify.call(notifier, changeRecords[i]);
					}
				}

				return result;
			};
		};

		var wrapMethodSplice = function (method, fn) {

			return function () {
				if (isMutating.get(this)) {
					return fn.apply(this, arguments);
				}
				if (method !== 'length') {
					isMutating.set(this, true);
				}
				var notifier = getNotifier(this),
					notify = notifier.notify,
					i;

				var old = this.slice(0),
					result = fn.apply(this, arguments),
					changeRecords = calcObjectChangeRecords(old, this, true),
					spliceRecord = calcSpliceRecords(old, this, method, slice.call(arguments, 0));

				if (spliceRecord) {
					notify.call(notifier, spliceRecord, true);
				}
				for (i = 0; i < changeRecords.length; i++) {
					notify.call(notifier, changeRecords[i], true);
				}

				isMutating.set(this, false);
				return result;
			};
		};

		/* These are mutators that do not generate splice records */
		[ 'copyWithin', 'fill', 'reverse', 'sort' ].forEach(function (method) {
			if (method in prototype) {
				descriptor = getDescriptor(prototype, method);
				descriptor.value = wrapMethod(method, descriptor.value);
				defineProperty(prototype, method, descriptor);
			}
		});

		/* These are mutators that generate splice records */
		[ 'push', 'unshift', 'pop', 'shift', 'splice' ].forEach(function (method) {
			if (method in prototype) {
				descriptor = getDescriptor(prototype, method);
				descriptor.value = wrapMethodSplice(method, descriptor.value);
				defineProperty(prototype, method, descriptor);
			}
		});

		defineProperties(prototype, {
			get: getPseudoPrivateDescriptor(arrayGet),
			set: getPseudoPrivateDescriptor(wrapMethod('set', arraySet)),
			observe: getPseudoPrivateDescriptor(arrayObserve),
			length: getHiddenAccessorDescriptor(getArrayLength, wrapMethodSplice('length', setArrayLength)),
			toArray: getPseudoPrivateDescriptor(observableArraytoArray),
			toString: getPseudoPrivateDescriptor(arrayToString)
		});
	}

	/**
	 * A class that provides integrated observation capabilities that are aligned to Project Harmony's observation
	 * APIs.  If native support of array observation is present, this will be offloaded to the native browser
	 * capabilities.
	 */
	function ObservableArray() {
		lengths.set(this, 0);
		isMutating.set(this, false);
		var args = prototype.slice.call(arguments, 0);
		if (args.length === 1 && typeof args[0] === 'number') {
			this.length = args[0];
		}
		else if (args.length) {
			this.push.apply(this, args);
		}
		observe.observed.set(this, true);
	}

	ObservableArray.prototype = prototype;

	return ObservableArray;
});