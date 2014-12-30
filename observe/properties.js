define([
	'../aspect',
	'../async',
	'../properties',
	'../WeakMap'
], function (aspect, async, properties, WeakMap) {
	'use strict';

	var isFrozen = Object.isFrozen,
		defineProperty = Object.defineProperty,
		around = aspect.around,
		getValueDescriptor = properties.getValueDescriptor;

	var pendingChangeRecords = new WeakMap(),
		notifiers = new WeakMap(),
		observedProperties = new WeakMap(),
		observers = [],
		transaction;

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

	var deliverAllChangeRecords = function () {
		var anyWorkDone = false;
		observers.forEach(function (observer) {
			if (deliverChangeRecords(observer)) {
				anyWorkDone = true;
			}
		});
		return anyWorkDone;
	};

	var enqueueChangeRecord = function (changeRecord, targets, arrayFlag) {
		var observer, accept, splice = 'splice';
		for (var i = 0, l = targets.length; i < l; i++) {
			observer = targets[i];
			accept = observer.accept;
			if (!(arrayFlag && accept && ~accept.indexOf(splice) && changeRecord.type !== splice)) {
				pendingChangeRecords.get(observer).push(changeRecord);
			}
		}
		/* Trigger a transaction to deliver the records that should complete at the end of turn */
		if (!transaction) {
			transaction = async(function () {
				deliverAllChangeRecords();
				transaction = undefined;
			});
		}
	};

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

	function Notifier(target) {
		this.target = target;
		this.observers = [];
	}

	Notifier.prototype = {
		target: null,
		observers: null,
		notify: function (changeRecord, arrayFlag) {
			var notifier = this,
				observers = notifier.observers;
			enqueueChangeRecord(changeRecord, observers, arrayFlag);
		}
	};

	var installObservableProperty = function (target, name, descriptor) {
		/* jshint maxcomplexity:15 */

		/**
		 * Create an updated change record
		 * @param  {Object} target   The target object being changed
		 * @param  {String} name     The name of the property being changed
		 * @param  {Mixed}  oldValue The previous value of the property
		 */
		function notifyUpdated(target, name, oldValue) {
			var notifier = notifiers.get(target);
			if (notifier) {
				var changeRecord = createChangeRecord('update', target, name, oldValue);
				notifier.notify(changeRecord);
			}
		}

		/**
		 * Generate a change record with the provided type
		 * @param  {String} type The type of change that occurred
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
		function adviseObservableAccessorDescriptor(descriptor) {
			return around(descriptor, 'get', function (setter) {
				return function (newValue) {
					var value = target[name],
						result = setter.call(this, newValue);
					if (value !== target[name]) {
						notifyUpdated(this, name, value);
					}
					return result;
				};
			});
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
						defineProperty(target, name, newDescriptor);
						targetObservedProperties[name] = {
							oldDescriptor: oldDescriptor,
							newDescriptor: newDescriptor
						};
						if (descriptor) {
							notify('reconfigured');
						}
					}
					else if (isAccessorDescriptor(oldDescriptor) && 'set' in oldDescriptor) {
						targetObservedProperties[name] = {
							handle: adviseObservableAccessorDescriptor(oldDescriptor)
						};
						if (descriptor) {
							defineProperty(target, name, oldDescriptor);
							targetObservedProperties.oldDescriptor = oldDescriptor;
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
				notify('add');
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
				handle = observedProperty.handle,
				value = target[name];
			if (handle) {
				handle.remove();
			}
			if (oldDescriptor) {
				defineProperty(target, name, oldDescriptor);
				target[name] = value;
			}
			else if (!handle) {
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
			var changeRecord = createChangeRecord('delete', target, name, value);
			notifier.notify(changeRecord);
		}
	};

	/**
	 * Remove and array of properties from the target object
	 * @param  {Object}        target The target where the properties should be removed
	 * @param  {Array(String)} names  The names of the properties to be delete from the target
	 */
	var removeObservableProperties = function (target, names) {
		names.forEach(function (name) {
			removeObservableProperty(target, name);
		});
	};

	var getNotifier = function (target) {
		if (isFrozen(target)) {
			return null;
		}
		if (!notifiers.has(target)) {
			notifiers.set(target, new Notifier(target));
		}
		return notifiers.get(target);
	};

	return {
		observers: observers,
		pendingChangeRecords: pendingChangeRecords,
		getNotifier: getNotifier,
		deliverChangeRecords: deliverChangeRecords,
		createChangeRecord: createChangeRecord,
		createSpliceChangeRecord: createSpliceChangeRecord,
		installObservableProperty: installObservableProperty,
		uninstallObservableProperty: uninstallObservableProperty,
		defineObservableProperty: defineObservableProperty,
		defineObservableProperties: defineObservableProperties,
		removeObservableProperty: removeObservableProperty,
		removeObservableProperties: removeObservableProperties
	};
});