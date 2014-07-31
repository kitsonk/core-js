define([
	'../compose',
	'../Evented'
], function (compose, Evented) {
	'use strict';

	var required = compose.required;

	var Store = compose(Evented, {
		queryEngine: null,
		get: required,
		getIdentity: required,
		put: required,
		add: function (object, options) {
			var store = this;
			(options = options || {}).overwrite = false;
			return store.put(object, options).then(function (id) {
				store.emit('add', {
					object: object,
					options: options,
					id: id
				});
			});
		},
		remove: required,
		query: required
	});

	return Store;
});