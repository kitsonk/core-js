define([
	'../compose',
	'../global',
	'../Promise',
	'../SideTable',
	'../errors/StoreError',
	'./_Store',
	'./util/emitEvent',
	'./util/queryResults',
	'./util/simpleQueryEngine'
], function (compose, global, Promise, SideTable, StoreError, _Store, emitEvent, queryResults, simpleQueryEngine) {
	'use strict';

	var uid = Date.now() % 1e9,
		localStorage = global.window && global.window.localStorage,
		property = compose.property,
		indexSideTable = new SideTable();
	
	return compose(_Store, function (options) {
		var data;
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
					localStorage.removeItem(index[key]);
				}
			}
			this.data = data;
		}
	}, {
		name: '',
		idProperty: 'id',
		queryEngine: simpleQueryEngine,
		indexKey: '__key',
		index: property({
			get: function () {
				var index = indexSideTable.get(this);
				if (!index) {
					var indexString = localStorage.getItem([this.name, this.indexKey].join('.'));
					indexSideTable.set(this, indexString ? JSON.parse(indexString) : {});
				}
				return index || indexSideTable.get(this);
			},
			set: function (value) {
				indexSideTable.set(this, value);
				localStorage.setItem([this.name, this.indexKey].join('.'), JSON.stringify(value));
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
					resolve(JSON.parse(localStorage.getItem(store.index[id])));
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
					localStorage.setItem(index[id], JSON.stringify(object));
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
						localStorage.removeItem(index[id]);
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
				data.push(JSON.parse(localStorage.getItem(store.index[key])));
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
				localStorage.removeItem(store.index[key]);
			}
			store.index = {};
			emitEvent(store, 'clear');
		}
	});
});