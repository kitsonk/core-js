define([
	'../compose',
	'../io-query',
	'../lang',
	'../on',
	'../request',
	'./_Store',
	'./util/emitEvent',
	'./util/queryResults'
], function (compose, ioQuery, lang, on, request, Store, emitEvent, queryResults) {
	'use strict';
	
	function getTarget(store, id) {
		var target = store.target;
		if (typeof id !== 'undefined') {
			if (target.charAt(target.length - 1) === '/') {
				target += id;
			}
			else {
				target += '/' + id;
			}
		}
		return target;
	}

	return compose(Store, function JsonRest(options) {
		this.headers = {};
		lang.mixin(this, options);
	}, {
		headers: {},
		target: '',
		ascendingPrefix: '+',
		descendingPrefix: '-',
		accepts: 'application/javascript, application/json',

		get: function (id, options) {
			var store = this,
				promise = request.get(getTarget(this, id), {
					responseType: 'json',
					headers: lang.mixin({ Accept: this.accepts }, this.headers, options && options.headers)
				}).then(function (response) {
					return (response && response.data) || undefined;
				});

			promise.then(function (object) {
				emitEvent(store, 'get', options, undefined, object, id);
			});

			return promise;
		},
		getIdentity: function (object) {
			return object[this.idProperty];
		},
		put: function (object, options, supressEmit) {
			options = options || {};
			var store = this,
				id = 'id' in options ? options.id : store.getIdentity(object),
				hasId = typeof id !== 'undefined',
				headers = lang.mixin({
					'Content-Type': 'application/json',
					Accept: store.accepts,
					'If-Match': options.overwrite === true ? '*' : null,
					'If-Match-None': options.overwrite === false ? '*' : null
				}, store.headers, options.headers),
				promise = request[hasId && !options.incremental ? 'put' : 'post'](getTarget(store, id), {
					responseType: 'json',
					data: JSON.stringify(object),
					headers: headers
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
				promise = request['delete'](getTarget(this, id), {
					headers: lang.mixin({}, this.headers, options && options.headers)
				});

			promise.then(function (response) {
				emitEvent(store, 'remove', options, response, undefined, id);
			});

			return promise;
		},
		query: function (query, options) {
			options = options || {};
			var store = this,
				headers = lang.mixin({ Accept: store.accepts }, store.headers, options.headers),
				hasQuestionMark = !!~store.target.indexOf('?');

			if (query && typeof query === 'object') {
				query = (query = ioQuery.objectToQuery(query)) ? (hasQuestionMark ? '&' : '?') + query : '';
			}
			if (options.start >= 0 || options.count >= 0) {
				headers['X-Range'] = 'items=' + (options.start || '0') + '-'
					+ (('count' in options && options.count !== Infinity) ? (options.count
						+ (options.start || 0) - 1): '');
				if (store.rangeParam) {
					query += (query || hasQuestionMark ? '&' : '?') + store.rangeParam + '=' + headers['X-Range'];
					hasQuestionMark = true;
				}
				else {
					headers.Range = headers['X-Range'];
				}
			}
			if (options.sort) {
				var sortParam = store.sortParam;
				query += (query || hasQuestionMark ? '&' : '?') + (sortParam ? sortParam + '=' : 'sort(');
				for (var i = 0, l = options.sort.length; i < l; i++) {
					var sort = options.sort[i];
					query += (i > 0 ? ',' : '') + (sort.descending ? store.descendingPrefix : store.ascendingPrefix)
						+ encodeURIComponent(sort.attribute);
				}
				if (!sortParam) {
					query += ')';
				}
			}
			var results = request.get(store.target + (query || ''), {
				responseType: 'json',
				headers: headers
			});

			results.then(function (response) {
				emitEvent(store, 'query', options, response, undefined, undefined, query, response && response.data);
			});

			var total = results.then(function (response) {
				var range = response && response.getHeader('Content-Range');
				if (!range) {
					range = response && response.getHeader('X-Content-Range');
				}
				return range && (range = range.match(/\/(.*)/)) && +range[1];
			});

			results = results.then(function (response) {
				if (response && response.data) {
					return response.data;
				}
				return response;
			});

			results.total = total;

			return queryResults(results);
		}
	});
});