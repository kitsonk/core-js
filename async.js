define([
	'./has',
	'./global',
	'./lang',
	'./CallbackQueue'
], function (has, global, lang, CallbackQueue) {
	'use strict';

	/* jshint node:true */

	has.add('dom-mutationobserver', function (global) {
		return has('host-browser') && (global.MutationObserver || global.WebKitMutationObserver);
	});

	var async;

	if (has('host-node') && typeof setImmediate !== 'undefined' && process.version.indexOf('v0.10.') === 0) {
		async = function (callback, binding) {
			setImmediate(function () {
				callback.call(binding);
			});
		};
	}
	else if (has('host-node')) {
		async = function (callback, binding) {
			var removed = false;
			process.nextTick(function () {
				if (removed) {
					return;
				}
				callback.call(binding);
			});
		};
	}
	else {
		var queue = new CallbackQueue();

		if (has('dom-mutationobserver')) {
			var MutationObserver = global.MutationObserver || global.WebKitMutationObserver,

				observer = new MutationObserver(function () {
					queue.drain();
				}),

				element = document.createElement('div');

			observer.observe(element, { attributes: true });

			async = function (callback, binding) {
				queue.add(lang.bind(binding, callback));
				element.setAttribute('dq', 'dq');
			};
		}
		else {
			var timer;
			async = function (callback, binding) {
				queue.add(lang.bind(binding, callback));

				if (!timer) {
					timer = setTimeout(function () {
						clearTimeout(timer);
						timer = null;
						queue.drain();
					}, 1);
				}
			};
		}
	}

	return async;
});