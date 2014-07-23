define([
	'../compose',
	'../Evented',
	'../Promise'
], function (compose, Evented, Promise) {
	'use strict';

	var required = compose.required;

	var Store = compose(Evented, {
		queryEngine: null,
		get: required,
		getIdentity: required,
		put: required,
		remove: function (id) {
			var store = this,
				promise = new Promise(function (resolve, reject) {
					delete store.index[id];
					var data = store.data,
						idProperty = store.idProperty,
						record;
					for (var i = 0, l = data.length; i < l; i++) {
						if (data[i][idProperty] === id) {
							record = data[i];
							data.splice(i, 1);
							resolve(record);
						}
					}
					if (!record) {
						reject(new Error('Record not Found.'));
					}
				});
			return promise;
		},
		query: required
	});

	return Store;
});