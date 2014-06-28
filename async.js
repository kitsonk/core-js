define([
	'./has'
], function (has) {
	'use strict';

	/* jshint node:true */

	var async;

	var MutationObserver = typeof window !== 'undefined' ? (window.MutationObserver ||
			window.WebKitMutationObserver) : undefined;

	if (has('host-node')) {
		async = function (callback, binding) {
			setImmediate(function () {
				callback.call(binding);
			});
		};
	}
	else if (MutationObserver) {
		var queue = [],

			observer = new MutationObserver(function () {
				var toProcess = queue.slice();
				queue = [];
				toProcess.forEach(function (tuple) {
					tuple[0].call(tuple[1]);
				});
			}),

			element = document.createElement('div');

		observer.observe(element, { attributes: true });

		async = function (callback, binding) {
			queue.push([ callback, binding ]);
			element.setAttribute('dq', 'dq');
		};
	}
	else {
		async = function (callback, binding) {
			setTimeout(function () {
				callback.call(binding);
			}, 1);
		};
	}

	return async;
});