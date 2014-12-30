define([
	'./observe',
	'../WeakMap',
	'./has!es7-object-observe?:./properties'
], function (observe, WeakMap, observableProperties) {
	'use strict';
	
	/* Stores any observe.summary callbacks on an object */
	var summaryCallbacks = new WeakMap(),
		deliverChangeRecords = observableProperties ? observableProperties.deliverChangeRecords :
			Object.deliverChangeRecords;

	return function summaryObserve(target, callback) {
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
				if (type === 'update') {
					return;
				}
				if (type === 'add') {
					if (name in removed) {
						delete removed[name];
					}
					else {
						added[name] = 1;
					}
					return;
				}
				/* if (type === 'delete') */
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
			oldValueFn = function oldValueFn(property) {
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
				deliverChangeRecords(observer);
				callbacks.splice(callbacks.indexOf(callback), 1);
				if (!callbacks.length) {
					handle && handle.remove();
					summaryCallbacks['delete'](target);
				}
			}
		};
	};
});