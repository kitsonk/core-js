define([
	'../compose',
	'../global',
	'../Promise',
	'../WeakMap',
	'../errors/StoreError',
	'./_Store',
	'./util/emitEvent',
	'./util/queryResults',
	'./util/simpleQueryEngine'
], function (compose, global, Promise, WeakMap, StoreError, _Store, emitEvent, queryResults, simpleQueryEngine) {
	'use strict';

	var uid = Date.now() % 1e9,
		property = compose.property,
		indexWeakMap = new WeakMap();
	
	return compose(_Store, function (options) {
		var data,
			store = this;
		for (var key in options) {
			switch (key) {
			case 'data':
				data = options[key];
				break;
			case 'index':
				break;
			default:
				this[key] = options[key];
			}
		}
		if (!this.name) {
			this.name = '__ls' + (1e9 * Math.random() >>> 0) + (uid++ + '__');
		}
		var index = this.index;
		if (data) {
			if (index) {
				for (key in index) {
					store.storage.removeItem(index[key]);
				}
			}
			this.data = data;
		}
	}, {
		name: '',
		storage: null,
		idProperty: 'id',
		queryEngine: simpleQueryEngine,
		indexKey: '__key',
		index: property({
			get: function () {
				var index = indexWeakMap.get(this);
				if (!index) {
					var indexString = this.storage.getItem([this.name, this.indexKey].join('.'));
					indexWeakMap.set(this, indexString ? JSON.parse(indexString) : {});
				}
				return index || indexWeakMap.get(this);
			},
			set: function (value) {
				indexWeakMap.set(this, value);
				this.storage.setItem([this.name, this.indexKey].join('.'), JSON.stringify(value));
			},
			enumerable: true,
			configurable: true
		}),
		data: property({
			set: function (value) {
				this.clear();
				for (var i = 0, l = value.length; i < l; i++) {
					this.put(value[i]);
				}
			},
			configurable: true
		}),
		get: function (id, options) {
			var store = this,
				promise = new Promise(function (resolve) {
					resolve(JSON.parse(store.storage.getItem(store.index[id])));
				});

			promise.then(function (object) {
				emitEvent(store, 'get', options, undefined, object, id);
			});

			return promise;
		},
		getIdentity: function (object) {
			return object[this.idProperty];
		},
		put: function (object, options, suppressEmit) {
			var store = this,
				index = store.index,
				idProperty = store.idProperty,
				id = object[idProperty] = (options && 'id' in options) ? options.id :
						idProperty in object ? object[idProperty] : (1e9 * Math.random() >>> 0) + String(uid++),
				promise = new Promise(function (resolve, reject) {
					if (!(id in index)) {
						index[id] = [store.name, id].join('.');
						store.index = index;
					}
					else if (options && options.overwrite === false) {
						reject(new StoreError('Object already exists'));
						return;
					}
					store.storage.setItem(index[id], JSON.stringify(object));
					resolve(id);
				});

			if (!suppressEmit) {
				promise.then(function (id) {
					emitEvent(store, 'put', options, id, object, id);
				});
			}

			return promise;
		},
		remove: function (id, options) {
			var store = this,
				index = store.index,
				promise = new Promise(function (resolve, reject) {
					if (id in index) {
						store.storage.removeItem(index[id]);
						delete index[id];
						store.index = index;
						resolve(true);
					}
					else {
						reject(new StoreError('Object not in store'));
					}
				});

			promise.then(function (response) {
				emitEvent(store, 'remove', options, response, undefined, id);
			});

			return promise;
		},
		query: function (query, options) {
			var store = this,
				data = [];

			for (var key in store.index) {
				data.push(JSON.parse(store.storage.getItem(store.index[key])));
			}
			var promise = queryResults(store.queryEngine(query, options)(data));

			promise.then(function (results) {
				emitEvent(store, 'query', options, results, undefined, undefined, query, results);
			});

			return promise;
		},
		clear: function () {
			var store = this,
				index = store.index;

			for (var key in index) {
				store.storage.removeItem(store.index[key]);
			}
			store.index = {};
			emitEvent(store, 'clear');
		}
	});
});