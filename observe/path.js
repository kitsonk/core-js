define([
	'./has!es7-object-observe?:./properties',
	'./observe',
	'./removeObserver',
	'../WeakMap'
], function (observableProperties, observe, removeObserver, WeakMap) {
	'use strict';

	var noop = function () {},
		installObservableProperty = observableProperties ? observableProperties.installObservableProperty : noop,
		deliverChangeRecords = observableProperties ? observableProperties.deliverChangeRecords :
			Object.deliverChangeRecords,
		keys = Object.keys;

	/* Stores any observe.path callbacks on an object */
	var pathCallbacks = new WeakMap();

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
	return function observePath(target, path, callback) {
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
				if (changeRecord.type === 'update') {
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
			installObservableProperty(target, name);
		}

		/* add callback to callbacks */
		callbacks[name].push(callback);

		/* return handle */
		return {
			remove: function () {
				deliverChangeRecords(observer);
				callbacks[name].splice(callbacks[name].indexOf(callback), 1);
				if (!callbacks[name].length) {
					delete callbacks[name];
					if (!keys(target).length) {
						removeObserver(target, observer);
					}
				}
			}
		};
	};
});