define([
	'../async',
	'../compose',
	'../global',
	'../on',
	'../Promise',
	'../WeakMap',
	'../errors/StoreError',
	'./_Store',
	'./has',
	'./util/emitEvent',
	'./util/idbQueryEngine',
	'./util/queryResults'
], function (async, compose, global, on, Promise, WeakMap, StoreError, _Store, has, emitEvent, idbQueryEngine,
		queryResults) {
	'use strict';

	var uid = Date.now() % 1e9,
		idb = has('storage-indexeddb'),
		property = compose.property,
		once = on.once,
		idbWeakMap = new WeakMap(),
		stateWeakMap = new WeakMap(),
		readyWeakMap = new WeakMap();

	function addput(store, type, object, options) {
		var db = idbWeakMap.get(store),
			idProperty = store.idProperty,
			id = object[idProperty] = (options && 'id' in options) ? options.id :
					idProperty in object ? object[idProperty] : (1e9 * Math.random() >>> 0) + String(uid++),
			promise = new Promise(function (resolve, reject) {
				var transaction = db.transaction([ store.name ], 'readwrite');
				once(transaction, 'error', function (error) {
					store.emit('error', error);
					reject(error);
				});
				once(transaction.objectStore(store.name)[type](object), 'success', function (event) {
					// async doesn't work under Chrome, thereby going with old standby
					setTimeout(function () {
						resolve(event.target.result);
					}, 1);
				});
			});

		promise.then(function (results) {
			emitEvent(store, type, options, results, object, id);
		});

		return promise;
	}

	return compose(_Store, function (options) {
		var store = this,
			data;
		for (var key in options) {
			if (key === 'data') {
				data = options[key];
			}
			else {
				store[key] = options[key];
			}
		}
		stateWeakMap.set(store, 'closed');
		store.ready = new Promise(function (resolve, reject) {
			readyWeakMap.set(store, [ resolve, reject ]);
		});
		if (data) {
			store.ready = store.ready.then(function () {
				return store.clear().then(function () {
					return store.putData(data);
				});
			});
		}
		if (store.autoOpen) {
			store.open();
		}
	}, {
		idProperty: 'id',
		queryEngine: idbQueryEngine,
		dbName: 'default',
		name: 'default',
		version: 1,
		autoOpen: true,
		ready: null,
		state: property({
			get: function () {
				return stateWeakMap.get(this);
			},
			enumerable: true,
			configurable: true
		}),
		open: function () {
			var store = this,
				state = stateWeakMap.get(store),
				promise = new Promise(function (resolve, reject) {
					if (state !== 'closed') {
						reject(new StoreError('Database is already open or opening'));
						return;
					}
					stateWeakMap.set(store, 'opening');
					var request = idb.open(store.dbName, store.version);
					once(request, 'error', function (event) {
						reject(event);
					});
					once(request, 'success', function () {
						resolve(request.result);
					});
					on(request, 'blocked', function (event) {
						store.emit('blocked', event);
					});
					on(request, 'upgradeneeded', function (event) {
						store.emit('upgradeneeded', event);
					});
				});

			return promise.then(function (db) {
				on(db, 'error', function (event) {
					store.emit('error', event);
				});
				stateWeakMap.set(store, 'open');
				idbWeakMap.set(store, db);
				readyWeakMap.get(store)[0](db);
				return db;
			}, function (error) {
				stateWeakMap.set(store, 'error');
				store.emit('error', error);
				readyWeakMap.get(store)[1](error);
				throw error;
			});
		},
		clear: function () {
			var store = this,
				db = idbWeakMap.get(store);

			return new Promise(function (resolve, reject) {
				var request = db.transaction(store.name, 'readwrite').objectStore(store.name).clear();
				once(request, 'error', function (error) {
					store.emit('error', error);
					reject(error);
				});
				once(request, 'success', function (event) {
					setTimeout(function () {
						store.emit('clear', event);
						resolve(event);
					}, 1);
				});
			});
		},
		close: function () {
			var store = this,
				state = stateWeakMap.get(store),
				db = idbWeakMap.get(store),
				promise = new Promise(function (resolve, reject) {
					if (state === 'opening') {
						reject(new StoreError('The database is being opened'));
						return;
					}
					if (state !== 'closed' && db) {
						db.close();
						idbWeakMap.delete(store);
						stateWeakMap.set(store, 'closed');
						store.ready = new Promise(function (res, rej) {
							readyWeakMap.set(store, [ res, rej ]);
						});
					}
					resolve();
				});

			return promise;
		},
		get: function (id, options) {
			var store = this,
				db = idbWeakMap.get(store),
				promise = new Promise(function (resolve, reject) {
					var request = db.transaction(store.name).objectStore(store.name).get(id);
					once(request, 'error', function (error) {
						store.emit('error', error);
						reject(error);
					});
					once(request, 'success', function (event) {
						resolve(event.target.result);
					});
				});

			promise.then(function (object) {
				emitEvent(store, 'get', options, undefined, object, id);
			});

			return promise;
		},
		getIdentity: function (object) {
			return object[this.idProperty];
		},
		put: function (object, options) {
			return addput(this, 'put', object, options);
		},
		add: function (object, options) {
			return addput(this, 'add', object, options);
		},
		remove: function (id, options) {
			var store = this,
				db = idbWeakMap.get(store),
				promise = new Promise(function (resolve, reject) {
					var request = db.transaction([ store.name ], 'readwrite').objectStore(store.name).delete(id);
					once(request, 'error', function (error) {
						store.emit('error', error);
						reject(error);
					});
					once(request, 'success', function (event) {
						setTimeout(function () {
							resolve(event);
						}, 1);
					});
				});

			promise.then(function (response) {
				emitEvent(store, 'remove', options, response, undefined, id);
			});

			return promise;
		},
		query: function (query, options) {
			var store = this,
				objectStore = idbWeakMap.get(store).transaction(store.name).objectStore(store.name),
				promise = queryResults(store.queryEngine(query, options)(objectStore));

			promise.then(function (results) {
				emitEvent(store, 'query', options, results, undefined, undefined, query, results);
			});

			return promise;
		},
		putData: function (data) {
			var store = this,
				db = idbWeakMap.get(store),
				objectStore;

			return new Promise(function (resolve, reject) {
				var transaction = db.transaction([ store.name ], 'readwrite'),
					ids = [],
					idProperty = store.idProperty,
					object;
				once(transaction, 'error', function (error) {
					store.emit('error', error);
					reject(error);
				});
				once(transaction, 'complete', function () {
					async(function () {
						store.emit('putdata', ids);
						resolve(ids);
					});
				});
				objectStore = transaction.objectStore(store.name);
				for (var i = 0, l = data.length; i < l; i++) {
					object = data[i];
					ids.push(object[idProperty] = idProperty in object ? object[idProperty] :
						(1e9 * Math.random() >>> 0) + String(uid++));
					objectStore.put(object);
				}
			});
		},
		onsuccess: null,
		onupgradeneeded: function (event) {
			var db = event.currentTarget.result;
			if (!db.objectStoreNames.contains(this.name)) {
				db.createObjectStore(this.name, { keyPath: this.idProperty });
			}
		},
		onclear: null,
		onerror: null,
		onblocked: null
	});
});