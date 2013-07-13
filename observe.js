define([
	'./aspect',
	'./properties',
	'./SideTable'
], function (aspect, properties, SideTable) {
	'use strict';

	var around = aspect.around,
		defineProperty = Object.defineProperty,
		defineProperties = Object.defineProperties,
		isFrozen = Object.isFrozen,
		keys = Object.keys;

	var pendingChangeRecords = new SideTable(),
		notifiers = new SideTable(),
		observedProperties = new SideTable(),
		observers = [],
		transaction;

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

	function deliverChangeRecords(observer) {
		var changeRecords = pendingChangeRecords.get(observer);
		pendingChangeRecords.set(observer, []);
		var array = [],
			n = 0;
		changeRecords.forEach(function (record) {
			array[n.toString()] = record;
			n++;
		});
		if (!n) {
			return false;
		}
		observer.call(undefined, array);
		return true;
	}

	function deliverAllChangeRecords() {
		var anyWorkDone = false;
		observers.forEach(function (observer) {
			if (deliverChangeRecords(observer)) {
				anyWorkDone = true;
			}
		});
		return anyWorkDone;
	}

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
			enumerable: true
		},
		object: {
			value: null,
			writable: true,
			enumerable: true
		},
		name: {
			value: name,
			writable: true,
			enumerable: true
		}
	});

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

	function getNotifier(target) {
		if (isFrozen(target)) {
			return null;
		}
		if (!notifiers.get(target)) {
			notifiers.set(target, new Notifier(target));
		}
		return notifiers.get(target);
	}

	function installObservableProperty(target, name, descriptor) {

		function notifyChange(target, oldValue) {
			var notifier = notifiers.get(target),
				changeRecord = new ChangeRecord('updated', target, name, oldValue);
			notifier.notify(changeRecord);
		}

		function notify(type) {
			var notifier = notifiers.get(target);
			if (notifier) {
				var changeRecord = new ChangeRecord(type, target, name);
				notifier.notify(changeRecord);
			}
		}

		function getObservableDataDescriptor(descriptor) {
			var value = descriptor.value;
			return {
				get: function () {
					return value;
				},
				set: function (newValue) {
					if (value !== newValue) {
						notifyChange(this, value);
						value = newValue;
					}
				},
				enumerable: descriptor.enumerable,
				configurable: true
			};
		}

		function getObservableAccessorDescriptor(descriptor) {
			return {
				get: descriptor.get,
				set: around(descriptor, 'set', function (setter) {
					return function (newValue) {
						var value = target[name],
							result = setter.call(this, newValue);
						if (value !== target[name]) {
							notifyChange(this, value);
						}
						return result;
					};
				}),
				enumerable: descriptor.enumerable,
				configurable: true
			};
		}

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
						notify(target.hasOwnProperty(name) ? 'reconfigued' : 'new');
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
					notify('reconfigued');
				}
			}
		}
	}

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

	function observe(target, properties, observer) {
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
		});
		addObserver(target, observer);
	}

	return observe;
});