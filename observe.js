define([
	'./aspect',
	'./has',
	'./properties',
	'./SideTable'
], function (aspect, has, properties, SideTable) {
	'use strict';

	/* Object.observe detection, specifically designed to not offload to shims/polyfills */
	has.add('es7-object-observe', typeof Object.observe === 'function' &&
		/\[native\scode\]/.test(Object.observe.toString()));
	/* Array.observe detection, specifically designed to not offload to shims/polyfills */
	has.add('es7-array-observe', typeof Array.observe === 'function' &&
		/\[native\scode\]/.test(Array.observe.toString()));

	var noop = function () {},
		around = aspect.around,
		isFrozen = Object.isFrozen,
		defineProperty = Object.defineProperty,
		defineProperties = Object.defineProperties,
		getReadOnlyDescriptor = properties.getReadOnlyDescriptor,
		getHiddenReadOnlyDescriptor = properties.getHiddenReadOnlyDescriptor,
		getValueDescriptor = properties.getValueDescriptor,
		keys = Object.keys,
		slice = Array.prototype.slice,
		push = Array.prototype.push;

	/**
	 * Check if the provided value is an array index value
	 * @param  {Mixed}   idx A value that needs to be checked to see if it can be an array index
	 * @return {Boolean}     Returns `true` is the provided value is an array index, otherwise `false`
	 */
	function isIndex(idx) {
		return +idx === idx >>> 0;
	}

	/**
	 * Take a string or number value and typecast it to a Number
	 * @param  {String|Number} idx The value to be converted
	 * @return {Number}            The valid index value
	 */
	function toIndex(idx) {
		return +idx;
	}

	/* allow for build optimisation when Object.observe is present */
	if (!has('es7-object-observe')) {

			/**
			 * The side table/weak map that contains the pending change records for the observed object
			 * @type {core/SideTable}
			 */
		var pendingChangeRecords = new SideTable(),

			/**
			 * The side table/weak map that contains the notifier objects for each observer function
			 * @type {core/SideTable}
			 */
			notifiers = new SideTable(),

			/**
			 * A hash of information about the observed properties that have been installed
			 * @type {core/SideTable}
			 */
			observedProperties = new SideTable(),

			/**
			 * The "global" variable of observers
			 * @type {Array}
			 */
			observers = [],

			/**
			 * A flag to indicate we are in a cycle of delivering change records
			 */
			transaction;

		/**
		 * Enqueue the change record as well as trigger the delivery of change records at the end of the turn.
		 * @param  {Object} changeRecord The change record that should be queued for delivery
		 * @param  {Array}  targets      The targeted observer functions the records should be delivered to
		 */
		var enqueueChangeRecord = function (changeRecord, targets, arrayFlag) {
			targets.forEach(function (observer) {
				var pending = pendingChangeRecords.get(observer),
					acceptArray = ~observer.accept.indexOf('splice');
				if (!acceptArray || (acceptArray && arrayFlag)) {
					pending.push(changeRecord);
				}
			});
			/* Trigger a transaction to deliver the records that should complete at the end of turn */
			if (!transaction) {
				transaction = setTimeout(function () {
					deliverAllChangeRecords();
					transaction = undefined;
				}, 0);
			}
		};

		/**
		 * Deliver any pending change records to the observer
		 * @param  {Function} observer The observer to deliver any pending change records to.
		 * @return {Boolean}           True if there were any change records delivered, false if not
		 */
		var deliverChangeRecords = function (observer) {
			var changeRecords = pendingChangeRecords.get(observer),
				accept;
			if (changeRecords.length) {
				pendingChangeRecords.set(observer, []);
				accept = observer.accept;

				/* if there are values in accept, then only deliver types accepted */
				if (accept && accept.length) {
					observer.call(undefined, changeRecords.filter(function (changeRecord) {
						return ~accept.indexOf(changeRecord.type);
					}));
				}
				/* else we should deliver everything but splice type records */
				else {
					observer.call(undefined, changeRecords.filter(function (changeRecord) {
						return changeRecord.type !== 'splice';
					}));
				}

				return true;
			}
			return false;
		};

		/**
		 * Deliver all change records to all observers
		 * @return {Boolean} True if there were any change records delivered, false if not
		 */
		var deliverAllChangeRecords = function () {
			var anyWorkDone = false;
			observers.forEach(function (observer) {
				if (deliverChangeRecords(observer)) {
					anyWorkDone = true;
				}
			});
			return anyWorkDone;
		};

		/**
		 * A record of a change to an object
		 * @param {String} type     The type of the change, `new`, `updated`, `reconfigured` or `deleted`.
		 * @param {[type]} object   The object where the change occurred
		 * @param {[type]} name     The name of the property
		 * @param {[type]} oldValue The properties previous value
		 */
		var createChangeRecord = function (type, object, name, oldValue) {
			var changeRecord = {
				type: type,
				object: object,
				name: name
			};
			if (typeof oldValue !== 'undefined') {
				changeRecord.oldValue = oldValue;
			}
			return changeRecord;
		};

		var createSpliceChangeRecord = function (object, index, removed, addedCount) {
			return {
				type: 'splice',
				object: object,
				index: index,
				removed: removed,
				addedCount: addedCount
			};
		};

		/**
		 * A class that handles the notification of changes that is weakly mapped to the object being observed
		 * @param {Object} target The object that is being observed
		 */
		var Notifier = function Notifier(target) {
			this.target = target;
			this.observers = [];
		};

		defineProperties(Notifier.prototype, {
			target: getValueDescriptor(null),
			observers: getValueDescriptor([]),
			notify: getValueDescriptor(function (changeRecord, arrayFlag) {
				var notifier = this,
					observers = notifier.observers;
				enqueueChangeRecord(changeRecord, observers, arrayFlag);
			})
		});

		/**
		 * Install a property on the target object that generates change records.
		 * @param  {Object} target       The object being observed
		 * @param  {String} name         The property being installed
		 * @param  {Object} [descriptor] The property descriptor to use instead of the existing property descriptor
		 */
		var installObservableProperty = function (target, name, descriptor) {
			/* jshint maxcomplexity:15 */

			/**
			 * Create an updated change record
			 * @param  {Object} target   The target object being changed
			 * @param  {String} name     The name of the property being changed
			 * @param  {Mixed}  oldValue The previous value of the property
			 */
			function notifyUpdated(target, name, oldValue) {
				var notifier = notifiers.get(target),
					changeRecord = createChangeRecord('updated', target, name, oldValue);
				notifier.notify(changeRecord);
			}

			/**
			 * Generate a change record with the provided type
			 * @param  {String} type The type of change that occured
			 */
			function notify(type) {
				var notifier = notifiers.get(target);
				if (notifier) {
					var changeRecord = createChangeRecord(type, target, name);
					notifier.notify(changeRecord);
				}
			}

			/**
			 * Take an existing property data descriptor and modify it to enqueue change records when its values change
			 * @param  {Object} descriptor The original property descriptor
			 * @return {Object}            The observable property descriptor
			 */
			function getObservableDataDescriptor(descriptor) {
				var value = descriptor.value;
				return {
					get: function () {
						return value;
					},
					set: function (newValue) {
						if (value !== newValue) {
							notifyUpdated(this, name, value);
							value = newValue;
						}
					},
					enumerable: descriptor.enumerable,
					configurable: true
				};
			}

			/**
			 * Take an existing accessor property descriptor and modify it to enqueue change records when its setter is
			 * provided with a value.
			 * @param  {Object} descriptor The original property descriptor
			 * @return {Object}            The observable property descriptor
			 */
			function getObservableAccessorDescriptor(descriptor) {
				return {
					get: descriptor.get,
					set: around(descriptor, 'set', function (setter) {
						return function (newValue) {
							var value = target[name],
								result = setter.call(this, newValue);
							if (value !== target[name]) {
								notifyUpdated(this, name, value);
							}
							return result;
						};
					}),
					enumerable: descriptor.enumerable,
					configurable: true
				};
			}

			/* Initialise the hash of observed properties on the target if not already present */
			var targetObservedProperties;
			if (!(targetObservedProperties = observedProperties.get(target))) {
				targetObservedProperties = {};
				observedProperties.set(target, targetObservedProperties);
			}

			var isDataDescriptor = properties.isDataDescriptor,
				isAccessorDescriptor = properties.isAccessorDescriptor,
				getDescriptor = properties.getDescriptor,
				oldDescriptor, newDescriptor;

			if (!(targetObservedProperties[name])) {
				if (name in target) {
					oldDescriptor = descriptor || getDescriptor(target, name);
					if (oldDescriptor.configurable) {
						/* only configurable properties can be observed */
						if (isDataDescriptor(oldDescriptor) && oldDescriptor.writable) {
							newDescriptor = getObservableDataDescriptor(oldDescriptor);
						}
						else if (isAccessorDescriptor(oldDescriptor) && 'set' in oldDescriptor) {
							newDescriptor = getObservableAccessorDescriptor(target, name, oldDescriptor);
						}
						if (newDescriptor) {
							defineProperty(target, name, newDescriptor);
							targetObservedProperties[name] = {
								oldDescriptor: oldDescriptor,
								newDescriptor: newDescriptor
							};
							if (descriptor) {
								notify('reconfigured');
							}
						}
					}
				}
				else {
					newDescriptor = getObservableDataDescriptor(descriptor || { value: undefined, enumerable: true });
					defineProperty(target, name, newDescriptor);
					targetObservedProperties[name] = {
						newDescriptor: newDescriptor
					};
					notify('new');
				}
			}
			else if (descriptor) {
				oldDescriptor = getDescriptor(target, name);
				if (oldDescriptor.configurable) {
					if (isDataDescriptor(descriptor)) {
						newDescriptor = {
							get: oldDescriptor.get,
							set: oldDescriptor.set,
							enumerable: descriptor.enumerable,
							configurable: descriptor.configurable
						};
						if (target[name] !== descriptor.value) {
							target[name] = descriptor.value;
						}
					}
					else {
						newDescriptor = getObservableDataDescriptor(descriptor);
						defineProperty(target, name, descriptor);
						targetObservedProperties[name].oldDescriptor = descriptor;
						notify('reconfigured');
					}
				}
			}
		};

		/**
		 * Restore an observed property back to its former property descriptor
		 * @param  {Object} target The object to have the property restored
		 * @param  {String} name   The name of the target property
		 */
		var uninstallObservableProperty = function (target, name) {
			var targetObservedProperties = observedProperties.get(target);
			if (targetObservedProperties && targetObservedProperties[name]) {
				var observedProperty = targetObservedProperties[name],
					oldDescriptor = observedProperty.oldDescriptor,
					value = target[name];
				if (oldDescriptor) {
					defineProperty(target, name, oldDescriptor);
					target[name] = value;
				}
				else {
					defineProperty(target, name, getValueDescriptor(value));
				}
				delete targetObservedProperties[name];
			}
		};

		/**
		 * Install an observable property on an object and return a handle that allows it to be uninstalled
		 * @param  {Object} target     The target object
		 * @param  {String} name       The name of the property to define
		 * @param  {Object} descriptor The "normal" property descriptor for the property, which will be transformed
		 *                             into an observable property descriptor
		 * @return {Object}            An handle with a `.remove()` property that allows the property to be unobserved
		 */
		var defineObservableProperty = function (target, name, descriptor) {
			installObservableProperty(target, name, descriptor);
			return {
				remove: function () {
					uninstallObservableProperty(target, name);
				}
			};
		};

		/**
		 * Install a hash of observable properties on an object and return a handle that allows them to be uninstalled
		 * @param  {Object} target      The target object
		 * @param  {Object} descriptors A hash of property descriptors where the key name is the property name to be
		 *                              defined.
		 * @return {Object}             A handle with a `.remove()` property that allows the properties to be unobserved
		 */
		var defineObservableProperties = function (target, descriptors) {
			var names = [];
			for (var name in descriptors) {
				installObservableProperty(target, name, descriptors[name]);
				names.push(name);
			}
			return {
				remove: function () {
					names.forEach(function (name) {
						uninstallObservableProperty(target, name);
					});
				}
			};
		};

		/**
		 * Remove (delete) an observable property from the target object
		 * @param  {Object} target The target where the property should be removed
		 * @param  {String} name   The name of the property to remove
		 */
		var removeObservableProperty = function (target, name) {
			var value = target[name];
			uninstallObservableProperty(target, name);
			delete target[name];

			var notifier = notifiers.get(target);
			if (notifier) {
				var changeRecord = createChangeRecord('deleted', target, name, value);
				notifier.notify(changeRecord);
			}
		};

		/**
		 * Remove and array of properties from the target object
		 * @param  {Object}        target The target where the properties should be removed
		 * @param  {Array(String)} names  The names of the properties to be deleted from the target
		 */
		var removeObservableProperties = function (target, names) {
			names.forEach(function (name) {
				removeObservableProperty(target, name);
			});
		};
	}

	/**
	 * Return the notifier associated with the observed object
	 * @param  {Object}                target The object that is being observed
	 * @return {core/observe/Notifier}        The instance of the notifier
	 */
	var getNotifier;
	if (has('es7-object-observe')) {
		getNotifier = Object.getNotifier;
	}
	else {
		getNotifier = function (target) {
			if (isFrozen(target)) {
				return null;
			}
			if (!notifiers.get(target)) {
				notifiers.set(target, new Notifier(target));
			}
			return notifiers.get(target);
		};
	}

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
				get: getHiddenReadOnlyDescriptor(function (idx) {
					return this[idx];
				}),
				set: getHiddenReadOnlyDescriptor(function (idx, value) {
					this[idx] = value;
				})
			});
		};
	}
	else {
		decorateArray = function (array) {

			/**
			 * Returns a function that wraps the native array functions that can modify the array and generates a delta of
			 * change records for the array
			 * @param  {String}   method The string name of the method providing advice for
			 * @param  {Function} fn     The original function being wrapped
			 * @return {Function}        The newly wrapped function
			 */
			var arrayAdvice = function (method, fn) {

				/* these are methods that should generate splice change records */
				var spliceMethods = [ 'push', 'unshift', 'pop', 'shift', 'splice' ];

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
									changeRecords.push(createChangeRecord('deleted', newArr, i, oldValue));
								}
								else if (typeof newValue === 'undefined') {
									changeRecords.push(createChangeRecord('new', newArr, i));
								}
								else {
									changeRecords.push(createChangeRecord('updated', newArr, i, oldValue));
								}
							}
						}
						for (i = oldLength; i < newLength; i++) {
							oldValue = oldArr[i];
							newValue = newArr[i];
							if (typeof newValue !== 'undefined') {
								changeRecords.push(createChangeRecord('new', newArr, i));
							}
						}

						/* record change in length */
						if (oldLength !== newLength) {
							changeRecords.push(createChangeRecord('updated', newArr, 'length', oldLength));
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

					/* notify the changes */
					for (i = 0; i < changeRecords.length; i++) {
						notify.call(notifier, changeRecords[i]);
					}

					/* notify array changes */
					if (~spliceMethods.indexOf(method)) {
						notify.call(notifier, calcSpliceRecords(old, this, method, slice.call(arguments, 0)), true);
					}
					else {
						for (i = 0; i < changeRecords.length; i++) {
							notify.call(notifier, changeRecords[i], true);
						}
					}

					/* return the original result */
					return result;
				};
			};

			var handles = [];

			/* Here we get advice around each of the original functions which can modify the array. */
			handles.push(around(array, 'pop', function (fn) {
				return arrayAdvice('pop', fn);
			}));
			handles.push(around(array, 'push', function (fn) {
				return arrayAdvice('push', fn);
			}));
			handles.push(around(array, 'reverse', function (fn) {
				return arrayAdvice('reverse', fn);
			}));
			handles.push(around(array, 'shift', function (fn) {
				return arrayAdvice('shift', fn);
			}));
			handles.push(around(array, 'sort', function (fn) {
				return arrayAdvice('sort', fn);
			}));
			handles.push(around(array, 'splice', function (fn) {
				return arrayAdvice('splice', fn);
			}));
			handles.push(around(array, 'unshift', function (fn) {
				return arrayAdvice('unshift', fn);
			}));

			/* We also add `get` and `set` to be able to track changes to the array, since directly watching all the elements
			 * would be a bit onerous */
			defineProperties(array, {
				get: getHiddenReadOnlyDescriptor(function (idx) {
					return this[idx];
				}),
				set: getHiddenReadOnlyDescriptor(arrayAdvice('set', function (idx, value) {
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

	/**
	 * Add an observer to a target
	 * @param {Object}   target   The target of the observer
	 * @param {Function} observer The function to be called when an observed change occurs
	 */
	var addObserver;
	if (has('es7-object-observe')) {
		addObserver = Object.observe;
	}
	else {
		addObserver = function (target, observer, accept) {
			if (typeof observer !== 'function') {
				throw new TypeError('observer must be a function');
			}
			if (isFrozen(observer)) {
				throw new TypeError('observer must not be frozen');
			}
			if (!accept) {
				accept = [];
			}
			if (typeof accept !== 'object' || !('length' in accept)) {
				throw new TypeError('accept must be an Array');
			}
			if (!pendingChangeRecords.get(observer)) {
				pendingChangeRecords.set(observer, []);
			}
			var notifier = getNotifier(target),
				targetObservers = notifier.observers;
			if (!~targetObservers.indexOf(observer)) {
				targetObservers.push(observer);
			}
			if (!~observers.indexOf(observer)) {
				observers.push(observer);
			}
			observer.accept = accept;
		};
	}

	/**
	 * Remove an observer from the targeted function
	 * @param  {Object}   target   The object being observed
	 * @param  {Function} observer The observing function
	 */
	var removeObserver;
	if (has('es7-object-observe')) {
		removeObserver = Object.unobserve;
	}
	else {
		removeObserver = function (target, observer) {
			if (typeof observer !== 'function') {
				throw new TypeError('observer must be a function');
			}
			var notifier = getNotifier(target),
				targetObservers = notifier.observers,
				idx;
			if (~(idx = targetObservers.indexOf(observer))) {
				targetObservers.splice(idx, 1);
			}
		};
	}

	/* Stores any observe.summary callbacks on an object */
	var summaryCallbacks = new SideTable();

	function summaryObserve(target, callback) {
		var callbacks,
			handle;

		/**
		 * This is the observer callback that takes change records and provides back a summary of the changes
		 * @param  {Array} changeRecords An array of change records
		 */
		function observer(changeRecords) {
			var added = {},
				removed = {},
				changed = {},
				oldValues = {},
				oldValueFn,
				prop,
				newValue;

			/* iterate over each of the change records */
			changeRecords.forEach(function (changeRecord) {
				var type = changeRecord.type,
					name = changeRecord.name;
				if (!(name in oldValues)) {
					oldValues[name] = changeRecord.oldValue;
				}
				if (type === 'updated') {
					return;
				}
				if (type === 'new') {
					if (name in removed) {
						delete removed[name];
					}
					else {
						added[name] = 1;
					}
					return;
				}
				/* if (type === 'deleted') */
				if (name in added) {
					delete added[name];
					delete oldValues[name];
				}
				else {
					removed[name] = 1;
				}
			});

			for (prop in added) {
				added[prop] = target[prop];
			}
			for (prop in removed) {
				removed[prop] = undefined;
			}
			for (prop in oldValues) {
				if (prop in added || prop in removed) {
					continue;
				}
				newValue = target[prop];
				if (oldValues[prop] !== newValue) {
					changed[prop] = newValue;
				}
			}

			/* allows access to the object of old values */
			oldValueFn = function (property) {
				return oldValues[property];
			};

			/* callback the callbacks */
			callbacks.forEach(function (callback) {
				callback.call(target, added, removed, changed, oldValueFn);
			});
		}

		/* type checking of the target */
		if (!(typeof target === 'object' || typeof target === 'function')) {
			throw new Error('target is not an object or function');
		}

		/* if there is no map of callbacks for this target, we are watching it */
		if (!(callbacks = summaryCallbacks.get(target))) {
			summaryCallbacks.set(target, callbacks = []);
			handle = observe(target, observer);
		}

		callbacks.push(callback);

		/* return a handle that can be used to removed the observation */
		return {
			remove: function () {
				callbacks.splice(callbacks.indexOf(callback), 1);
				if (!callbacks.length) {
					handle && handle.remove();
					summaryCallbacks['delete'](target);
				}
			}
		};
	}

	/* Stores any observe.array callbacks on an object */
	var arrayCallbacks = new SideTable();

	/**
	 * Create a new splice record
	 * @param  {Number} index      The index where the splice relates to
	 * @param  {Array}  removed    The elements that were removed from the array
	 * @param  {Number} addedCount The count of elements that were added
	 * @return {Object}            The splice record
	 */
	function newSplice(index, removed, addedCount) {
		return {
			index: index,
			removed: removed,
			addedCount: addedCount
		};
	}

	/**
	 * Calculate the intersection of two spans of indexes
	 * @param  {Number} start1 The first start index
	 * @param  {Number} end1   The first end index
	 * @param  {Number} start2 The second start index
	 * @param  {Number} end2   The second end index
	 * @return {Number}        Returns `-1` the spans do not intersect, `0` if they are adjacent to each other, other
	 *                         the position where the spans start to intersect.
	 */
	function intersect(start1, end1, start2, end2) {
		/* disjoint */
		if (end1 < start2 || end2 > start1) {
			return -1;
		}

		/* adjacent */
		if (end1 === start2 || end2 === start1) {
			return 0;
		}

		/* non-zero intersect, span1 first */
		if (start1 < start2) {
			if (end1 < end2) {
				return end1 - start2; /* overlap */
			}
			else {
				return end2 - start2; /* contained */
			}
		}
		/* non-zero intersect, span2 first */
		else {
			if (end2 < end1) {
				return end2 - start1; /* overlap */
			}
			else {
				return end1 - start1; /* contained */
			}
		}
	}

	/**
	 * Take a set of splices and merge in another splice where possible.  The input `splices` array will be modified
	 * appropriately.
	 * @param  {Array}  splices    The array of splice records
	 * @param  {Number} index      The new splices index
	 * @param  {Array}  removed    Any elements that are removed from the array
	 * @param  {Number} addedCount The count of elements that were added to the array
	 */
	function mergeSplice(splices, index, removed, addedCount) {
		var splice = newSplice(index, removed, addedCount),
			inserted = false,
			insertionOffset = 0,
			intersectCount,
			deleteCount,
			current,
			currentRemoved,
			prepend,
			append,
			offset,
			i;

		/* iterate through the existing splices */
		for (i = 0; i < splices.length; i++) {
			current = splices[i];
			currentRemoved = current.removed;
			current.index += insertionOffset;

			/* TODO: is this actually the most efficient way of handling the loop after the splice has been inserted? */
			/* the new splice has already been inserted, so need to do anything further */
			if (inserted) {
				continue;
			}

			/* determine how this splice */
			intersectCount = intersect(splice.index, splice.index + splice.removed.length, current.index,
				current.index + current.addedCount);

			/* if the intersectCount is a valid index (>=0), then the splice can be merged */
			if (~intersectCount) {
				splices.splice(i, 1);
				i--;

				insertionOffset -= current.addedCount - currentRemoved.length;

				splice.addedCount += current.addedCount - intersectCount;
				deleteCount = splice.removed.length + currentRemoved.length - intersectCount;

				if (!splice.addedCount && !deleteCount) {
					/* merged splice is a noop, discard */
					inserted = true;
				}
				else {
					if (splice.index < current.index) {
						/* some prefix of splice.removed is prepended to current.removed */
						prepend = splice.removed.slice(0, current.index - splice.index);
						push.apply(prepend, currentRemoved);
						currentRemoved = prepend;
					}

					if (splice.index + splice.removed.length > current.index + current.addedCount) {
						/* some suffix of splice.removed is appended to current.removed */
						append = splice.removed.slice(current.index + current.addedCount - splice.index);
						push.apply(currentRemoved, append);
					}

					splice.removed = currentRemoved;
					if (current.index < splice.index) {
						splice.index = current.index;
					}
				}
			}
			/* otherwise, if the new splice index precedes the current index, then this splice goes before the
			   current one, so go ahead and put it in */
			else if (splice.index < current.index) {
				inserted = true;

				splices.splice(i, 0, splice);
				i++;

				offset = splice.addedCount - splice.removed.length;
				current.index += offset;
				insertionOffset += offset;
			}
		}

		/* if we didn't insert the splice elsewhere, we need to append it */
		if (!inserted) {
			splices.push(splice);
		}
	}

	/**
	 * Creates the initial set of splice records from a set of change records which then need to be optimised further
	 * @param  {Array} changeRecords An array of change records
	 * @return {Array}               An array of splice records which then can be further optimised
	 */
	function createInitialSplices(changeRecords) {
		var splices = [],
			changeRecord,
			idx,
			i;

		/* iterate through the change records */
		for (i = 0; i < changeRecords.length; i++) {
			changeRecord = changeRecords[i];
			switch (changeRecord.type) {
			case 'splice':
				/* go ahead and try to merge this splice into any other splices */
				mergeSplice(splices, changeRecord.index, changeRecord.removed.slice(), changeRecord.addedCount);
				break;
			case 'new':
			case 'updated':
			case 'deleted':
				/* weed out any changes to non-index values that might be reported */
				if (!isIndex(changeRecord.name)) {
					continue;
				}
				idx = toIndex(changeRecord.name);
				if (!~idx) {
					continue;
				}
				/* convert the change into a splice and merge it */
				mergeSplice(splices, idx, [ changeRecord.oldValue ], 1);
				break;
			default:
				console.error('Unexpected record type:', JSON.stringify(changeRecord));
			}
		}

		return splices;
	}

	/**
	 * Determine what part of two arrays match, starting from the start of the array
	 * @param  {Array} first        The first array
	 * @param  {Array} second       The second array
	 * @param  {Number} searchLength How deep into the array to search
	 * @return {Number}              The index point at where the arrays diverge up to the searchLength
	 */
	function sharedPrefix(first, second, searchLength) {
		for (var i = 0; i < searchLength; i++) {
			if (first[i] !== second[i]) {
				return i;
			}
		}
		return searchLength;
	}

	/**
	 * Determine what part of two arrays match, starting from the end of the array
	 * @param  {Array} first        The first array
	 * @param  {Array} second       The second array
	 * @param  {Number} searchLength How deep from the end of the array to search
	 * @return {Number}              The count from at the end of the arrays where the two diverge
	 */
	function sharedSuffix(first, second, searchLength) {
		var firstIndex = first.length,
			secondIndex = second.length,
			count = 0;
		while (count < searchLength && first[--firstIndex] === second[--secondIndex]) {
			count++;
		}
		return count;
	}

	/* "constants" used in calculating the changes to an array */
	var EDIT_LEAVE = 0,
		EDIT_UPDATE = 1,
		EDIT_ADD = 2,
		EDIT_DELETE = 3;

	/**
	 * Given a set of distances, determine the minimal number of operations needed to perform the same change
	 * @param  {Array(Array)} distances A table of distances
	 * @return {Array}                  An array of edits to be made
	 */
	function spliceOperationsFromEditDistances(distances) {
		/* jshint maxcomplexity:11 */
		var i = distances.length - 1,
			j = distances[0].length - 1,
			current = distances[i][j],
			edits = [],
			northWest,
			west,
			north,
			min;

		while (i > 0 || j > 0) {
			if (i === 0) {
				edits.push(EDIT_ADD);
				j--;
				continue;
			}
			if (j === 0) {
				edits.push(EDIT_DELETE);
				i--;
				continue;
			}
			northWest = distances[i - 1][j - 1];
			west = distances[i - 1][j];
			north = distances[i][j - 1];

			min = west < north ? (west < northWest ? west : northWest) : (north < northWest ? north : northWest);

			if (min === northWest) {
				if (northWest === current) {
					edits.push(EDIT_LEAVE);
				}
				else {
					edits.push(EDIT_UPDATE);
					current = northWest;
				}
				i--;
				j--;
			}
			else if (min === west) {
				edits.push(EDIT_DELETE);
				i--;
				current = west;
			}
			else {
				edits.push(EDIT_ADD);
				j--;
				current = north;
			}
		}

		edits.reverse();
		return edits;
	}

	/**
	 * Generate the table of distances used to determine the least amount of edits that need to be made to provide a
	 * set of slices.
	 * @param  {Array}        current      The current targeted array
	 * @param  {Number}       currentStart The index where to start the table
	 * @param  {Number}       currentEnd   The index where to stop the table
	 * @param  {Array}        old          The previous array
	 * @param  {Number}       oldStart     The old index where to start the table
	 * @param  {Number}       oldEnd       The old index where to stop the table
	 * @return {Array(Array)}              The table of distances between edit changes to the two arrays
	 */
	function calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd) {
		/* "deletion" columns */
		var rowCount = oldEnd - oldStart + 1,
			columnCount = currentEnd - currentStart + 1,
			distances = new Array(rowCount);

		var north, west;

		/* "addition" rows, initialise null column */
		for (var i = 0; i < rowCount; i++) {
			distances[i] = new Array(columnCount);
			distances[i][0] = i;
		}

		/* initialise null row */
		for (var j = 0; j < columnCount; j++) {
			distances[0][j] = j;
		}

		for (i = 1; i < rowCount; i++) {
			for (j = 1; j < columnCount; j++) {
				if (old[oldStart + i - 1] === current[currentStart + j - 1]) {
					distances[i][j] = distances[i - 1][j - 1];
				}
				else {
					north = distances[i - 1][j] + 1;
					west = distances[i][j - 1] + 1;
					distances[i][j] = north < west ? north : west;
				}
			}
		}

		return distances;
	}

	/**
	 * Given two arrays, calculate the minimum number of splices needed to transform the previous array to the current
	 * array
	 * @param  {Array} current       The current array
	 * @param  {Number} currentStart The index where to start calculating the difference
	 * @param  {Number} currentEnd   The index where to stop calculating the difference
	 * @param  {Array} old           The previous array
	 * @param  {Number} oldStart     The previous array index where to start calculating the difference
	 * @param  {Number} oldEnd       The previous array index where to stop calculating the difference
	 * @return {Array}               The array of splice records
	 */
	function calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd) {
		var prefixCount = 0,
			suffixCount = 0,
			minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart),
			splice,
			ops;

		function applyOps(ops, idx, oldIdx) {
			/* jshint maxcomplexity:11 */
			var splice,
				splices = [],
				i;

			for (i = 0; i < ops.length; i++) {
				switch (ops[i]) {
				case EDIT_LEAVE:
					if (splice) {
						splices.push(splice);
						splice = undefined;
					}
					idx++;
					oldIdx++;
					break;
				case EDIT_UPDATE:
					if (!splice) {
						splice = newSplice(idx, [], 0);
					}
					splice.removed.push(old[oldIdx]);
					oldIdx++;
					break;
				case EDIT_ADD:
					if (!splice) {
						splice = newSplice(idx, [], 0);
					}
					splice.addedCount++;
					idx++;
					break;
				case EDIT_DELETE:
					if (!splice) {
						splice = newSplice(idx, [], 0);
					}
					splice.removed.push(old[oldIdx]);
					oldIdx++;
					break;
				}
			}

			if (splice) {
				splices.push(splice);
			}

			return splices;
		}

		if (currentStart === 0 && oldStart === 0) {
			prefixCount = sharedPrefix(current, old, minLength);
		}
		if (currentEnd === current.length && oldEnd === old.length) {
			suffixCount = sharedSuffix(current, old, minLength - prefixCount);
		}
		currentStart += prefixCount;
		oldStart += prefixCount;
		currentEnd -= suffixCount;
		oldEnd -= suffixCount;

		if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
			return [];
		}

		if (currentStart === currentEnd) {
			splice = newSplice(currentStart, [], 0);
			while (oldStart < oldEnd) {
				splice.removed.push(old[oldStart++]);
			}
			return [ splice ];
		}
		else if (oldStart === oldEnd) {
			return [ newSplice(currentStart, [], currentEnd - currentStart) ];
		}

		ops = spliceOperationsFromEditDistances(calcEditDistances(current, currentStart, currentEnd, old, oldStart,
			oldEnd));
		
		return applyOps(ops, currentStart, oldStart);
	}

	/**
	 * Take a set of change records and convert them into splice records.
	 *
	 * This and other supporting functions is directly adapted from Rafael Weinstien's
	 * [ChangeSummary](https://github.com/rafaelw/ChangeSummary),  which is part of Polymer's
	 * [Model Driven Views](https://github.com/polymer/mdv).
	 * 
	 * @param  {Array} target        The "subject" of the change records
	 * @param  {Array} changeRecords An array of change records that have occured to the array
	 * @return {Array}               An array of splice records.
	 */
	function projectArraySplices(target, changeRecords) {
		var splices = [];

		createInitialSplices(changeRecords).forEach(function (splice) {
			if (splice.addedCount === 1 && splice.removed.length === 1) {
				if (splice.removed[0] !== target[splice.index]) {
					splices.push(splice);
				}
				return;
			}

			splices = splices.concat(calcSplices(target, splice.index, splice.index + splice.addedCount,
				splice.removed, 0, splice.removed.length));
		});

		return splices;
	}

	/**
	 * Observe an array and provide summary splice records for the changes to the array.
	 * @param  {Array}   target   The array that should be targeted
	 * @param  {Function} callback The callback function that should be called when there are changes to the array
	 * @return {Object}            A handle object with a remove function that can be used to unobserve the array
	 */
	function arrayObserve(target, callback) {
		var callbacks,
			handle;

		/**
		 * The observation function that will take the Object.observe change records and convert them into splices
		 * @param  {Array} changeRecords An array of changes emitted by Object.observe
		 */
		function observer(changeRecords) {
			var splices = projectArraySplices(target, changeRecords);
			callbacks.forEach(function (callback) {
				callback.call(target, splices);
			});
		}

		if (!(target instanceof Array)) {
			throw new Error('target is not an Array');
		}

		if (!(callbacks = arrayCallbacks.get(target))) {
			arrayCallbacks.set(target, callbacks = []);
			handle = observe(target, observer, false, null, [ 'new', 'updated', 'deleted', 'splice' ]);
		}

		callbacks.push(callback);

		return {
			remove: function () {
				callbacks.splice(callbacks.indexOf(callback), 1);
				if (!callbacks.length) {
					handle && handle.remove();
					arrayCallbacks['delete'](target);
				}
			}
		};
	}

	/* Stores any observe.path callbacks on an object */
	var pathCallbacks = new SideTable();

	/**
	 * Observe value updates to a targets path (a string where sub-properties are separated by dots (`.`)).  The
	 * `callback` will be called with two arguments of `oldValue` (the value prior to the change) and `newValue` (the
	 * value after the change)
	 * @param  {Object}   target   The object to be observed
	 * @param  {String}   path     A "path" to the property to be observed, where `foo` would equate to `'target.foo'`
	 *                             and `'foo.bar'` would equate to `target.foo.bar`.
	 * @param  {Function} callback A function that will be called with two arguments, the first argument representing
	 *                             the value before the change and the second being the value after the change
	 * @return {Object}            A handle with a method of `.remove()`
	 */
	function pathObserve(target, path, callback) {
		var pathArray = path.split('.'),
			callbacks,
			prop,
			name,
			handle;

		/**
		 * This is the observer callback that will read the change records of any path callbacks and then callback the
		 * path callbacks as appropriate.
		 * @param  {Array} changeRecords An array of change records for objects being observed
		 */
		function observer(changeRecords) {
			var targetCallbacks,
				callbacks,
				name,
				obj,
				oldValue,
				currentValue;
			changeRecords.forEach(function (changeRecord) {
				if (changeRecord.type === 'updated') {
					obj = changeRecord.object;
					targetCallbacks = pathCallbacks.get(obj);
					name = changeRecord.name;
					if (targetCallbacks && name in targetCallbacks) {
						oldValue = changeRecord.oldValue;
						currentValue = obj[name];
						callbacks = targetCallbacks[name];
						callbacks.forEach(function (callback) {
							callback.call(obj, currentValue, oldValue);
						});
					}
				}
			});
		}

		/* traverse the path */
		while (pathArray.length) {
			name = pathArray.shift();
			if (name in target) {
				prop = target[name];
				if (pathArray.length) {
					if (typeof prop === 'object' || typeof prop === 'function') {
						target = prop;
					}
					else {
						throw new TypeError('Tried to observe a path that cannot resolve to a property.\n"' + name +
							'" is not an object or function.');
					}
				}
			}
			else {
				throw new Error('Cannot resolve path "' + path + '", "' + name + '" not found.');
			}
		}

		/* determine if there are any callbacks registered on the target */
		if (!(callbacks = pathCallbacks.get(target))) {
			callbacks = {};
			pathCallbacks.set(target, callbacks);
			handle = observe(target, observer, false, [ name ]);
		}

		/* determine if this particular property callback is registered */
		if (!(name in callbacks)) {
			callbacks[name] = [];
			(installObservableProperty || noop)(target, name);
		}

		/* add callback to callbacks */
		callbacks[name].push(callback);

		/* return handle */
		return {
			remove: function () {
				callbacks[name].splice(callbacks[name].indexOf(callback), 1);
				if (!callbacks[name].length) {
					delete callbacks[name];
					if (!keys(target).length) {
						removeObserver(target, observer);
					}
				}
			}
		};
	}

	/**
	 * Observe an object for changes
	 * @param  {Object}       target     The target of the observation
	 * @param  {Function}     observer   The function where change records will be dispatched to
	 * @param  {Boolean}      deep       If any of the observable properties are also objects, should it also observe
	 *                                   those properties as well
	 * @param  {Array|String} properties An optional argument that specifies specifically which properties should be
	 *                                   observed
	 * @return {Object}                  A handle that will remove the observer
	 */
	function observe(target, observer, deep, properties, accept) {
		var handles = [];
		if (target instanceof Array) {
			if (deep) {
				target.forEach(function (item) {
					if (typeof item === 'object' && item !== null) {
						handles.push(observe(item, observer, deep));
					}
				});
			}
			handles.push(decorateArray(target));
		}
		else {
			if (properties && typeof properties === 'string') {
				properties = properties.split(/\s+/);
			}
			else if (!properties) {
				properties = [];
			}
			if (!(properties instanceof Array)) {
				throw new TypeError('properties must be an Array or undefined');
			}
			if (!properties.length) {
				properties = keys(target);
			}
			var targetValue;
			properties.forEach(function (property) {
				targetValue = target[property];
				if (deep && typeof targetValue === 'object' && targetValue !== null) {
					handles.push(observe(targetValue, observer, deep, null, accept));
				}
				if (!has('es7-object-observe') && property in target) {
					installObservableProperty(target, property);
				}
			});
		}
		addObserver(target, observer, accept);
		return {
			remove: function () {
				handles.forEach(function (item) {
					item && item.remove && item.remove();
				});
				removeObserver(target, observer);
			}
		};
	}

	/* expose external API */
	defineProperties(observe, {
		install: getReadOnlyDescriptor(installObservableProperty || noop),
		uninstall: getReadOnlyDescriptor(uninstallObservableProperty || noop),
		summary: getReadOnlyDescriptor(summaryObserve),
		array: getReadOnlyDescriptor(arrayObserve),
		path: getReadOnlyDescriptor(pathObserve),
		getNotifier: getReadOnlyDescriptor(getNotifier),
		deliverChangeRecords: getReadOnlyDescriptor(deliverChangeRecords || Object.deliverChangeRecords),
		defineProperty: getReadOnlyDescriptor(defineObservableProperty || defineProperty),
		defineProperties: getReadOnlyDescriptor(defineObservableProperties || defineProperties),
		removeProperty: getReadOnlyDescriptor(removeObservableProperty || function (target, name) {
			delete target[name];
		}),
		removeProperties: getReadOnlyDescriptor(removeObservableProperties || function (target, names) {
			names.forEach(function (name) {
				delete target[name];
			});
		})
	});

	return observe;
});