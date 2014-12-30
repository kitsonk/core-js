define([
	'./WeakMap'
], function (WeakMap) {
	'use strict';

	var callbacks = new WeakMap(),
		noop = function () {};

	function CallbackQueue() {
		callbacks.set(this, []);
	}

	CallbackQueue.prototype = {
		add: function (callback) {
			var _callback = {
				active: true,
				callback: callback
			};

			callbacks.get(this).push(_callback);
			callback = null;

			return {
				remove: function () {
					this.remove = noop;
					_callback.active = false;
					callback = null;
				}
			};
		},
		drain: function () {
			var args = Array.prototype.slice.call(arguments),
				_callbacks = callbacks.get(this),
				item;

			callbacks.set(this, []);
			for (var i = 0, l = _callbacks.length; i < l; i++) {
				item = _callbacks[i];
				if (item && item.active) {
					item.callback.apply(null, args);
				}
			}
		}
	};

	return CallbackQueue;
});