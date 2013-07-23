define([
	'./aspect',
	'./has',
	'./properties',
	'./SideTable'
], function (aspect, has, properties, SideTable) {
	'use strict';

	/* Object.observe detection */
	has.add('es7-object-observe', typeof Object.observe === 'function');

	var noop = function () {},
		around = aspect.around,
		isFrozen = Object.isFrozen,
		defineProperty = Object.defineProperty,
		defineProperties = Object.defineProperties,
		keys = Object.keys;


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
		var enqueueChangeRecord = function (changeRecord, targets) {
			targets.forEach(function (observer) {
				pendingChangeRecords.get(observer).push(changeRecord);
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
			var changeRecords = pendingChangeRecords.get(observer);
			if (changeRecords.length) {
				pendingChangeRecords.set(observer, []);
				observer.call(undefined, changeRecords);
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

		/**
		 * A class that handles the notification of changes that is weakly mapped to the object being observed
		 * @param {Object} target The object that is being observed
		 */
		var Notifier = function Notifier(target) {
			this.target = target;
			this.observers = [];
		};

		defineProperties(Notifier.prototype, {
			target: {
				value: null,
				writable: true,
				enumerable: true,
				configurable: true
			},
			observers: {
				value: [],
				writable: true,
				enumerable: true,
				configurable: true
			},
			notify: {
				value: function (changeRecord) {
					var notifier = this,
						observers = notifier.observers;
					enqueueChangeRecord(changeRecord, observers);
				},
				writable: true,
				enumerable: true,
				configurable: true
			}
		});

		/**
		 * Install a property on the target object that generates change records.
		 * @param  {Object} target       The object being observed
		 * @param  {String} name         The property being installed
		 * @param  {Object} [descriptor] The property descriptor to use instead of the existing property descriptor
		 */
		var installObservableProperty = function (target, name, descriptor) {
			/* jshint maxcomplexity:12 */

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
			if (!observedProperties.get(target)) {
				observedProperties.set(target, {});
			}

			var targetObservedProperties = observedProperties.get(target),
				isDataDescriptor = properties.isDataDescriptor,
				isAccessorDescriptor = properties.isAccessorDescriptor,
				getDescriptor = properties.getDescriptor,
				oldDescriptor, newDescriptor;

			if (!(name in targetObservedProperties)) {
				if (name in target) {
					oldDescriptor = descriptor || getDescriptor(target, name);
					if (oldDescriptor.configurable) {
						// only configurable properties can be observed
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
							notify(target.hasOwnProperty(name) ? 'reconfigured' : 'new');
						}
					}
				}
				else {
					newDescriptor = getObservableDataDescriptor({ value: undefined, enumerable: true });
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
					defineProperty(target, name, {
						value: value,
						writable: true,
						enumerable: true,
						configurable: true
					});
				}
				delete targetObservedProperties[name];
			}
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
	var observeArray;
	if (has('es7-object-observe')) {
		/* this will make it API compatible when offloading to Object.observe */
		observeArray = function (array) {
			defineProperties(array, {
				get: {
					value: function (idx) {
						return this[idx];
					},
					configurable: true
				},
				set: {
					value: function (idx, value) {
						this[idx] = value;
					},
					configurable: true
				}
			});
		};
	}
	else {
		observeArray = function (array) {

			/**
			 * Returns a function that wraps the native array functions that can modify the array and generates a delta of
			 * change records for the array
			 * @param  {Function} fn The original function being wrapped
			 * @return {Function}    The newly wrapped function
			 */
			var arrayObserver = function (fn) {
				return function () {
					var notifier = getNotifier(this),
						notify = notifier.notify,
						i;

					/* save the state of the existing array */
					var old = this.slice(0),
						oldLength = this.length;

					/* execute the original function */
					var result = fn.apply(this, arguments);

					/* now look for changes in the array */
					for (i = 0; i < oldLength; i++) {
						if (old[i] !== this[i]) {
							if (typeof this[i] === 'undefined') {
								notify.call(notifier, createChangeRecord('deleted', this, i, old[i]));
							}
							else if (typeof old[i] === 'undefined') {
								notify.call(notifier, createChangeRecord('new', this, i));
							}
							else {
								notify.call(notifier, createChangeRecord('updated', this, i, old[i]));
							}
						}
					}
					for (i = old.length; i < this.length; i++) {
						if (typeof this[i] !== 'undefined') {
							notify.call(notifier, createChangeRecord('new', this, i));
						}
					}

					/* and verify the length is right */
					if (oldLength !== this.length) {
						notify.call(notifier, createChangeRecord('updated', this, 'length', oldLength));
					}

					/* return the original result */
					return result;
				};
			};

			var handles = [];

			/* Here we get advice around each of the original functions which can modify the array. */
			handles.push(around(array, 'pop', arrayObserver));
			handles.push(around(array, 'push', arrayObserver));
			handles.push(around(array, 'reverse', arrayObserver));
			handles.push(around(array, 'shift', arrayObserver));
			handles.push(around(array, 'sort', arrayObserver));
			handles.push(around(array, 'splice', arrayObserver));
			handles.push(around(array, 'unshift', arrayObserver));

			/* We also add `get` and `set` to be able to track changes to the array, since directly watching all the elements
			 * would be a bit onerous */
			defineProperties(array, {
				get: {
					value: function (idx) {
						return this[idx];
					},
					configurable: true
				},
				set: {
					value: arrayObserver(function (idx, value) {
						this[idx] = value;
					}),
					configurable: true
				}
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
		addObserver = function (target, observer) {
			if (typeof observer !== 'function') {
				throw new TypeError('observer must be a function');
			}
			if (isFrozen(observer)) {
				throw new TypeError('observer must not be frozen');
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

	/* Stores any observe.path callbacks on an object */
	var pathCallbacks = new SideTable();

	/**
	 * This is the observer callback that will read the change records of any path callbacks and then callback the
	 * path callbacks as appropriate.
	 * @param  {Array} changeRecords An array of change records for objects being observed
	 */
	function pathObserver(changeRecords) {
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
						callback.call(obj, oldValue, currentValue);
					});
				}
			}
		});
	}

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
	function observePath(target, path, callback) {
		var pathArray = path.split('.'),
			callbacks,
			prop,
			name,
			handle;

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
			handle = observe(target, pathObserver, false, [ name ]);
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
				callbacks.splice(callbacks.indexOf(callback), 1);
				if (!callbacks.length) {
					pathCallbacks['delete'](target);
					removeObserver(target, pathObserver);
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
	function observe(target, observer, deep, properties) {
		var handles = [];
		if (target instanceof Array) {
			if (deep) {
				target.forEach(function (item) {
					if (typeof item === 'object' && item !== null) {
						handles.push(observe(item, observer, deep));
					}
				});
			}
			handles.push(observeArray(target));
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
					handles.push(observe(targetValue, observer, deep));
				}
				if (!has('es7-object-observe') && property in target) {
					installObservableProperty(target, property);
				}
			});
		}
		addObserver(target, observer);
		return {
			remove: function () {
				handles.forEach(function (item) {
					item && item.remove && item.remove();
				});
				removeObserver(target, observer);
			}
		};
	}

	defineProperties(observe, {
		install: {
			value: function (target, name) {
				var targetValue = target[name],
					typeofTarget = typeof target;
				if (typeofTarget !== 'undefined' && targetValue !== null) {
					if (typeofTarget === 'object' && targetValue instanceof Array) {
						return observeArray(targetValue);
					}
					else if (installObservableProperty) {
						return installObservableProperty(target, name);
					}
				}
			},
			enumerable: true,
			configurable: true
		},
		uninstall: {
			value: uninstallObservableProperty || noop,
			enumerable: true,
			configurable: true
		},
		path: {
			value: observePath,
			enumerable: true,
			configurable: true
		},
		getNotifier: {
			value: getNotifier,
			enumerable: true,
			configurable: true
		}
	});

	return observe;
});