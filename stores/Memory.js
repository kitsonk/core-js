define([
	'../compose',
	'../lang',
	'../Promise',
	'../WeakMap',
	'../errors/StoreError',
	'./_Store',
	'./util/emitEvent',
	'./util/queryResults',
	'./util/simpleQueryEngine'
], function (compose, lang, Promise, WeakMap, StoreError, Store, emitEvent, queryResults, simpleQueryEngine) {
	'use strict';

	var dataWeakMap = new WeakMap(),
		property = compose.property,
		uid = Date.now() % 1e9;

	var Memory = compose(Store, function (options) {
		lang.mixin(this, options);
		if (!(options && options.data)) {
			this.data = [];
		}
	}, {
		data: property({
			get: function () {
				return dataWeakMap.get(this);
			},
			set: function (data) {
				dataWeakMap.set(this, data);
				this.index = {};
				for (var i = 0, l = data.length; i < l; i++) {
					this.index[data[i][this.idProperty]] = i;
				}
			},
			enumerable: true
		}),
		idProperty: 'id',
		index: null,
		queryEngine: simpleQueryEngine,
		get: function (id, options) {
			var store = this,
				promise = new Promise(function (resolve) {
					resolve(store.data[store.index[id]]);
				});

			promise.then(function (object) {
				emitEvent(store, 'get', options, undefined, object, id);
			});

			return promise;
		},
		getIdentity: function (object) {
			var store = this,
				promise = new Promise(function (resolve) {
					resolve(object[store.idProperty]);
				});
			return promise;
		},
		put: function (object, options, supressEmit) {
			var store = this,
				data = store.data,
				index = store.index,
				idProperty = store.idProperty;

			var promise = new Promise(function (resolve, reject) {
				var id = object[idProperty] = (options && 'id' in options) ? options.id
						: idProperty in object ? object[idProperty] : (1e9 * Math.random() >>> 0) + String(uid++);

				if (id in index) {
					if (options && options.overwrite === false) {
						reject(new StoreError('Object already exists'));
						return;
					}
					data[index[id]] = object;
				}
				else {
					index[id] = data.push(object) - 1;
				}
				resolve(id);
			});

			if (!supressEmit) {
				promise.then(function (response) {
					emitEvent(store, 'put', options, response, object);
				});
			}

			return promise;
		},
		/* add: inherited, */
		remove: function (id, options) {
			var store = this,
				index = store.index,
				data = store.data;

			var promise = new Promise(function (resolve, reject) {
				if (id in index) {
					data.splice(index[id], 1);
					store.data = data;
					resolve(true);
				}
				else {
					reject(new StoreError('ID not found'));
				}
			});

			promise.then(function (response) {
				emitEvent(store, 'remove', options, response, undefined, id);
			});

			return promise;
		},
		query: function (query, options) {
			var store = this,
				promise = queryResults(this.queryEngine(query, options)(this.data));

			promise.then(function (results) {
				emitEvent(store, 'query', options, results, undefined, undefined, query, results);
			});
			return promise;
		}
	});

	return Memory;
});