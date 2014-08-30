define([
	'./has',
	'./has!es7-object-observe?:./properties'
], function (has, observableProperties) {
	'use strict';

	var addObserver;
	if (has('es7-object-observe')) {
		addObserver = Object.observe;
	}
	else {
		addObserver = function addObserver(target, observer, accept) {
			var isFrozen = Object.isFrozen,
				pendingChangeRecords = observableProperties.pendingChangeRecords,
				getNotifier = observableProperties.getNotifier,
				observers = observableProperties.observers;
			
			if (typeof observer !== 'function') {
				throw new TypeError('observer must be a function');
			}
			if (isFrozen(observer)) {
				throw new TypeError('observer must not be frozen');
			}
			if (!accept) {
				accept = [];
			}
			if (!Array.isArray(accept)) {
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
			return target;
		};
	}

	return addObserver;
});