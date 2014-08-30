define([
	'./has',
	'./has!es7-object-observe?:./properties'
], function (has, observableProperties) {
	'use strict';

	var removeObserver;
	if (has('es7-object-observe')) {
		removeObserver = Object.unobserve;
	}
	else {
		removeObserver = function removeObserver(target, observer) {
			var getNotifier = observableProperties.getNotifier;
			
			if (typeof observer !== 'function') {
				throw new TypeError('observer must be a function');
			}
			var targetObservers = getNotifier(target).observers,
				idx;
			if (~(idx = targetObservers.indexOf(observer))) {
				targetObservers.splice(idx, 1);
			}
			return target;
		};
	}

	return removeObserver;
});