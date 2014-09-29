define([
	'./has',
	'./global',
	'./doc',
	'./CallbackQueue'
], function (has, global, doc, CallbackQueue) {
	'use strict';

	var readyStates = { 'loaded': 1, 'complete': 1 },
		ready = !!readyStates[doc.readyState],
		readyQ = new CallbackQueue();

	function domReady(callback) {
		readyQ.add(callback);
		if (ready) {
			readyQ.drain();
		}
	}

	domReady.load = function (id, req, load) {
		domReady(load);
	};

	if (!ready) {
		var detectReady = function (evt) {
				evt = evt || global.event;
				if (ready || (evt.type === 'readystatechange' && !readyStates[doc.readyState])) { return; }

				ready = 1;
				readyQ.drain();
			},
			on = function (node, event) {
				node.addEventListener(event, detectReady, false);
				readyQ.add(function () { node.removeEventListener(event, detectReady, false); });
			};

		on(doc, 'DOMContentLoaded');
		on(global, 'load');
		on(doc, 'readystatechange');
	}

	return domReady;
});
