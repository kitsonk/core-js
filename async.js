define([
	'./has',
	'./global'
], function (has, global) {
	'use strict';

	/* jshint node:true */

	has.add('dom-mutationobserver', function (global) {
		return has('host-browser') && (global.MutationObserver || global.WebKitMutationObserver);
	});

	var async;

	if (has('host-node') && typeof setImmediate !== 'undefined' && process.version.indexOf('v0.10.') === 0) {
		async = function (callback, binding) {
			var timer = setImmediate(function () {
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
	else if (has('dom-mutationobserver')) {
		var queue = [],
			MutationObserver = global.MutationObserver || global.WebKitMutationObserver,

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