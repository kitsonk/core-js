define([
	'../compose',
	'../lang',
	'./observe',
	'./path',
	'./summary',
	'./has!es7-object-observe?:./properties'
], function (compose, lang, observe, path, summary, observableProperties) {
	'use strict';

	var slice = Array.prototype.slice,
		property = compose.property;

	function addThis(fn) {
		return function () {
			var args = slice.apply(arguments);
			args.unshift(this);
			return fn.apply(this, args);
		};
	}

	var Observable = compose(function (options) {
		if (typeof options === 'object') {
			lang.mixin(this, options);
		}
	}, {
		observe: property({
			value: addThis(observe)
		}),
		summary: property({
			value: addThis(summary)
		}),
		path: property({
			value: addThis(path)
		})
	});

	if (observableProperties) {
		Observable.defineProperty = observableProperties.defineObservableProperty;
		Observable.defineProperties = observableProperties.defineObservableProperties;
		Observable.removeProperty = observableProperties.removeObservableProperty;
		Observable.removeProperties = observableProperties.removeObservableProperties;
	}
	else {
		Observable.defineProperty = Object.defineProperty;
		Observable.defineProperties = Object.defineProperties;
		Observable.removeProperty = function (target, property) {
			delete target[property];
		};
		Observable.removeProperties = function (target, properties) {
			properties.forEach(function (property) {
				delete target[property];
			});
		};
	}

	return Observable;
});