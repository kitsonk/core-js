define([
	'../compose',
	'../Evented',
	'./util/emitEvent'
], function (compose, Evented, emitEvent) {
	'use strict';

	var required = compose.required;

	var Store = compose(Evented, {
		queryEngine: null,
		get: required,
		getIdentity: required,
		put: required,
		add: function (object, options) {
			var store = this,
				promise;
			(options = options || {}).overwrite = false;
			promise = store.put(object, options, true);

			promise.then(function (response) {
				emitEvent(store, 'add', options, response, object);
			});

			return promise;
		},
		remove: required,
		query: required,
		onget: null,
		onput: null,
		onadd: null,
		onremove: null,
		onquery: null
	});

	return Store;
});