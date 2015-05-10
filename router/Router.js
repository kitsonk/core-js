define([
	'../compose',
	'../lang',
	'../Evented',
	'../Registry',
	'../WeakMap',
	'./has!html5-history?./history:./hash'
], function (compose, lang, Evented, Registry, WeakMap, history) {
	'use strict';

	var property = compose.property,
		handlesMap = new WeakMap(),
		startFlags = new WeakMap(),
		around = compose.around;

	var Router = compose(Evented, Registry, function (kwArgs) {
		lang.mixin(this, kwArgs);
		var handles = [];
		handlesMap.set(this, handles);
		startFlags.set(this, false);
		handles.push(history.on('change', lang.bind(this, '_onHistoryChange')));
	}, {
		start: function () {
			startFlags.set(this, true);
		},
		stop: function () {
			startFlags.set(this, false);
		},
		go: function (path, replace) {
			//
		},

		register: around(function (origFunc) {
			var self = this;
			return function (test, value, first) {
				return origFunc.call(self, test, value, first);
			};
		}),

		destroy: function () {
			startFlags.delete(this);
			var handles = handlesMap.get(this);
			handles.forEach(function (handle) {
				if (handle && handle.remove) {
					handle.remove();
				}
			});
			handlesMap.delete(this);
		},

		_onHistoryChange: property({
			value: function (e) {
				console.log(e);
			},
			configurable: true
		}),

		onchange: null
	});

	return Router;

});