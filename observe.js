define([
	'./aspect',
	'./properties',
	'./SideTable'
], function (aspect, properties, SideTable) {
	'use strict';

	/* vars to sub methods to support optimisation */
	var around = aspect.around,
		defineProperty = Object.defineProperty,
		defineProperties = Object.defineProperties,
		isFrozen = Object.isFrozen,
		keys = Object.keys;

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
	 * @param  {[type]} changeRecord [description]
	 * @param  {[type]} targets      [description]
	 * @return {[type]}              [description]
	 */
	function enqueueChangeRecord(changeRecord, targets) {
		targets.forEach(function (observer) {
			pendingChangeRecords.get(observer).push(changeRecord);
		});
		if (!transaction) {
			transaction = setTimeout(function () {
				deliverAllChangeRecords();
				transaction = undefined;
			}, 0);
		}
	}

	/**
	 * Deliver any pending change records to the observer
	 * @param  {Function} observer The observer to deliver any pending change records to.
	 * @return {Boolean}           True if there were any change records delivered, false if not
	 */
	function deliverChangeRecords(observer) {
		var changeRecords = pendingChangeRecords.get(observer);
		if (changeRecords.length) {
			pendingChangeRecords.set(observer, []);
			observer.call(undefined, changeRecords);
			return true;
		}
		return false;
	}

	/**
	 * Deliver all change records to all observers
	 * @return {Boolean} True if there were any change records delivered, false if not
	 */
	function deliverAllChangeRecords() {
		var anyWorkDone = false;
		observers.forEach(function (observer) {
			if (deliverChangeRecords(observer)) {
				anyWorkDone = true;
			}
		});
		return anyWorkDone;
	}

	/**
	 * A record of a change to an object
	 * @param {String} type     The type of the change, `new`, `updated`, `reconfigured` or `deleted`.
	 * @param {[type]} object   The object where the change occurred
	 * @param {[type]} name     The name of the property
	 * @param {[type]} oldValue The properties previous value
	 */
	function ChangeRecord(type, object, name, oldValue) {
		this.type = type;
		this.object = object;
		this.name = name;
		if ('undefined' !== typeof oldValue) {
			defineProperty(this, 'oldValue', {
				value: oldValue,
				writable: true,
				enumerable: true
			});
		}
	}

	defineProperties(ChangeRecord.prototype, {
		type: {
			value: '',
			writable: true,
			enumerable: true,
			configurable: true
		},
		object: {
			value: null,
			writable: true,
			enumerable: true,
			configurable: true
		},
		name: {
			value: name,
			writable: true,
			enumerable: true,
			configurable: true
		}
	});

	/**
	 * A class that handles the notification of changes that is weakly mapped to the object being observed
	 * @param {Object} target The object that is being observed
	 */
	function Notifier(target) {
		this.target = target;
		this.observers = [];
	}

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
	 * Return the notifier associated with the observed object
	 * @param  {Object}                target The object that is being observed
	 * @return {core/observe/Notifier}        The instance of the notifier
	 */
	function getNotifier(target) {
		if (isFrozen(target)) {
			return null;
		}
		if (!notifiers.get(target)) {
			notifiers.set(target, new Notifier(target));
		}
		return notifiers.get(target);
	}

	/**
	 * Converts an array into an observable one
	 * @param  {Array} array Takes a standard array and converts it into an observable one
	 * @return {Array}       A reference to the observable array
	 */
	function observeArray(array) {

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
							notify.call(notifier, new ChangeRecord('deleted', this, i, old[i]));
						}
						else if (typeof old[i] === 'undefined') {
							notify.call(notifier, new ChangeRecord('new', this, i));
						}
						else {
							notify.call(notifier, new ChangeRecord('updated', this, i, old[i]));
						}
					}
				}
				for (i = old.length; i < this.length; i++) {
					if (typeof this[i] !== 'undefined') {
						notify.call(notifier, new ChangeRecord('new', this, i));
					}
				}

				/* and verify the length is right */
				if (oldLength !== this.length) {
					notify.call(notifier, new ChangeRecord('updated', this, 'length', oldLength));
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
		Object.defineProperties(array, {
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
	}

	/**
	 * Install a property on the target object that generates change records.
	 * @param  {Object} target       The object being observed
	 * @param  {String} name         The property being installed
	 * @param  {Object} [descriptor] The property descriptor to use instead of the existing property descriptor
	 */
	function installObservableProperty(target, name, descriptor) {
		/* jshint maxcomplexity:12 */

		/**
		 * Create an updated change record
		 * @param  {Object} target   The target object being changed
		 * @param  {String} name     The name of the property being changed
		 * @param  {Mixed}  oldValue The previous value of the property
		 */
		function notifyUpdated(target, name, oldValue) {
			var notifier = notifiers.get(target),
				changeRecord = new ChangeRecord('updated', target, name, oldValue);
			notifier.notify(changeRecord);
		}

		/**
		 * Generate a change record with the provided type
		 * @param  {String} type The type of change that occured
		 */
		function notify(type) {
			var notifier = notifiers.get(target);
			if (notifier) {
				var changeRecord = new ChangeRecord(type, target, name);
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
	}

	/**
	 * Restore an observed property back to its former property descriptor
	 * @param  {Object} target The object to have the property restored
	 * @param  {String} name   The name of the target property
	 */
	function uninstallObservableProperty(target, name) {
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
	}

	/**
	 * Add an observer to a target
	 * @param {Object}   target   The target of the observer
	 * @param {Function} observer The function to be called when an observed change occurs
	 */
	function addObserver(target, observer) {
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
	}

	/**
	 * Remove an observer from the targeted function
	 * @param  {Object}   target   The object being observed
	 * @param  {Function} observer The observing function
	 */
	function removeObserver(target, observer) {
		if (typeof observer !== 'function') {
			throw new TypeError('observer must be a function');
		}
		var notifier = getNotifier(target),
			targetObservers = notifier.observers,
			idx;
		if (~(idx = targetObservers.indexOf(observer))) {
			targetObservers.splice(idx, 1);
		}
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
			handles.push(observeArray(target));
			if (deep) {
				target.forEach(function (item) {
					if (typeof item === 'object' && item !== null) {
						handles.push(observe(item, observer, deep));
					}
				});
			}
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
			properties.forEach(function (property) {
				if (property in target) {
					installObservableProperty(target, property);
				}
				if (deep && typeof target[property] === 'object' && target[property] !== null) {
					handles.push(observe(target[property], observer, deep));
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
			value: installObservableProperty,
			enumerable: true,
			configurable: true
		},
		uninstall: {
			value: uninstallObservableProperty,
			enumerable: true,
			configurable: true
		},
		getObservers: {
			value: function (target) {
				return getNotifier(target).observers;
			}
		},
		ChangeRecord: {
			value: ChangeRecord,
			enumerable: true,
			configurable: true
		}
	});

	return observe;
});