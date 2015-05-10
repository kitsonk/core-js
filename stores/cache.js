define([
	'../lang'
], function (lang) {
	'use strict';
	
	return function cache(masterStore, cacheStore, options) {
		options = options || {};
		return lang.delegate(masterStore, {
			queryEngine: masterStore.queryEngine || cacheStore.queryEngine,
			query: function (query, directives) {
				var isLoaded = options.isLoaded,
					results = masterStore.query(query, directives);
				results.forEach(function (object) {
					if (!isLoaded || isLoaded(object)) {
						cacheStore.put(object, directives);
					}
				});
				return results;
			},
			get: function (id, directives) {
				return cacheStore.get(id, directives).then(function (result) {
					return result || masterStore.get(id, directives).then(function (result) {
						if (result) {
							cacheStore.put(result, { id: id });
						}
						return result;
					});
				});
			},
			add: function (object, directives) {
				return masterStore.add(object, directives).then(function (result) {
					cacheStore.add(typeof result === 'object' ? result : object, directives);
					return result;
				});
			},
			put: function (object, directives) {
				cacheStore.remove((directives && directives.id) || this.getIdentity(object));
				return masterStore.put(object, directives).then(function (result) {
					cacheStore.put(typeof result === 'object' ? result : object, directives);
					return result;
				});
			},
			remove: function (id, directives) {
				return masterStore.remove(id, directives).then(function () {
					return cacheStore.remove(id, directives);
				});
			},
			evict: function (id, directives) {
				return cacheStore.remove(id, directives);
			}
		});
	};
});