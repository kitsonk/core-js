define([
	'./has',
	'./has!es7-object-observe?:./properties',
	'../aspect',
	'../properties'
], function (has, observableProperties, aspect, properties) {
	'use strict';

	var defineProperties = Object.defineProperties,
		getPseudoPrivateDescriptor = properties.getPseudoPrivateDescriptor;

	/**
	 * Converts an array into an observable one
	 * @param  {Array} array Takes a standard array and converts it into an observable one
	 * @return {Array}       A reference to the observable array
	 */
	var decorateArray;
	if (has('es7-object-observe')) {
		/* this will make it API compatible when offloading to Object.observe */
		decorateArray = function (array) {
			defineProperties(array, {
				get: getPseudoPrivateDescriptor(function (idx) {
					return this[idx];
				}),
				set: getPseudoPrivateDescriptor(function (idx, value) {
					this[idx] = value;
				})
			});

			return {
				remove: function () {
					delete array.get;
					delete array.set;
				}
			};
		};
	}
	else {
		var slice = Array.prototype.slice,
			getNotifier = observableProperties.getNotifier,
			createChangeRecord = observableProperties.createChangeRecord,
			createSpliceChangeRecord = observableProperties.createSpliceChangeRecord,
			around = aspect.around;

		var arrayMutators = [ 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift' ]
				.filter(function (mutator) {
					return mutator in Array.prototype;
				});

		/* these are methods that should generate splice change records */
		var spliceMethods = [ 'push', 'unshift', 'pop', 'shift', 'splice' ];

		decorateArray = function (array) {

			/**
			 * Returns a function that wraps the native array functions that can modify the array and generates a delta
			 * of change records for the array
			 * @param  {String}   method The string name of the method providing advice for
			 * @param  {Function} fn     The original function being wrapped
			 * @return {Function}        The newly wrapped function
			 */
			var arrayAdvice = function (method, fn) {

				return function () {
					var notifier = getNotifier(this),
						notify = notifier.notify,
						i;

					/**
					 * Calculates change records for an array based on Object.observe without splice records
					 * @param  {Array} oldArr The original array
					 * @param  {Array} newArr The current array
					 * @return {Array}        An array of change records that represent the delta between the two
					 *                        arrays.
					 */
					function calcObjectChangeRecords(oldArr, newArr) {
						var oldLength = oldArr.length,
							newLength = newArr.length,
							oldValue,
							newValue,
							i,
							changeRecords = [];

						/* iterate through array and find any changes */
						for (i = 0; i < oldLength; i++) {
							oldValue = oldArr[i];
							newValue = newArr[i];
							if (oldValue !== newValue) {
								if (typeof newValue === 'undefined') {
									changeRecords.push(createChangeRecord('delete', newArr, i, oldValue));
								}
								else if (typeof newValue === 'undefined') {
									changeRecords.push(createChangeRecord('add', newArr, i));
								}
								else {
									changeRecords.push(createChangeRecord('update', newArr, i, oldValue));
								}
							}
						}
						for (i = oldLength; i < newLength; i++) {
							oldValue = oldArr[i];
							newValue = newArr[i];
							if (typeof newValue !== 'undefined') {
								changeRecords.push(createChangeRecord('add', newArr, i));
							}
						}

						/* record change in length */
						if (oldLength !== newLength) {
							changeRecords.push(createChangeRecord('update', newArr, 'length', oldLength));
						}

						return changeRecords;
					}

					function calcSpliceRecords(oldArr, newArr, method, args) {
						var addedCount = 0,
							idx,
							argsLength = args.length,
							newArrLength = newArr.length,
							removed = [],
							removedCount;
						switch (method) {
						case 'push':
							addedCount = argsLength;
							idx = newArrLength - argsLength;
							break;
						case 'unshift':
							addedCount = argsLength;
							idx = 0;
							break;
						case 'pop':
							removed.push(oldArr[newArrLength]);
							idx = newArrLength;
							break;
						case 'shift':
							removed.push(oldArr[0]);
							idx = 0;
							break;
						case 'splice':
							removedCount = args[1];
							idx = args[0];
							if (removedCount) {
								removed = slice.call(oldArr, idx, idx + removedCount);
							}
							addedCount = args.slice(2).length;
						}

						return createSpliceChangeRecord(newArr, idx, removed, addedCount);
					}

					/* save the state of the existing array */
					var old = this.slice(0);

					/* execute the original function */
					var result = fn.apply(this, arguments);

					/* calculate any changes in the array */
					var changeRecords = calcObjectChangeRecords(old, this);

					/* notify array changes */
					if (~spliceMethods.indexOf(method)) {
						notify.call(notifier, calcSpliceRecords(old, this, method, slice.call(arguments, 0)), true);
						for (i = 0; i < changeRecords.length; i++) {
							notify.call(notifier, changeRecords[i], true);
						}
					}
					else {
						for (i = 0; i < changeRecords.length; i++) {
							notify.call(notifier, changeRecords[i]);
						}
					}

					/* return the original result */
					return result;
				};
			};

			var handles = [];

			/* Here we get advice around each of the original functions which can modify the array. */
			arrayMutators.forEach(function (method) {
				handles.push(around(array, method, function (fn) {
					return arrayAdvice(method, fn);
				}));
			});

			/* We also add `get` and `set` to be able to track changes to the array, since directly watching all the
			 * elements would be a bit onerous */
			defineProperties(array, {
				get: getPseudoPrivateDescriptor(function (idx) {
					return this[idx];
				}),
				set: getPseudoPrivateDescriptor(arrayAdvice('set', function (idx, value) {
					this[idx] = value;
				}))
			});

			/* provide a handle that can be used to "reset" the array */
			return {
				remove: function () {
					handles.forEach(function (handle) {
						handle && handle.remove && handle.remove();
					});
					delete array.get;
					delete array.set;
				}
			};
		};
	}

	return decorateArray;
});