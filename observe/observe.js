define([
	'./addObserver',
	'./decorateArray',
	'./has',
	'./has!es7-object-observe?:./properties',
	'./removeObserver'
], function (addObserver, decorateArray, has, observableProperties, removeObserver) {
	'use strict';

	var keys = Object.keys,
		isArray = Array.isArray;

	return function observe(target, observer, deep, properties, accept) {
		var handles = [];
		if (isArray(target)) {
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
			if (!(isArray(properties))) {
				throw new TypeError('properties must be an Array, String or undefined');
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
					observableProperties.installObservableProperty(target, property);
				}
			});
		}
		addObserver(target, observer, accept);
		return {
			remove: function () {
				removeObserver(target, observer);
				handles.forEach(function (item) {
					item && item.remove && item.remove();
				});
			}
		};
	};
});