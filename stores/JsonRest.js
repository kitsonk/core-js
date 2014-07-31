define([
	'../compose',
	'../io-query',
	'../lang',
	'../request',
	'./Store',
	'./util/queryResults'
], function (compose, ioQuery, lang, request, Store, queryResults) {
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
		get: function (id, options) {
			return request.get(getTarget(this, id), {
				responseType: 'json',
				headers: lang.mixin({ Accept: this.accepts }, this.headers, options && options.headers)
			});
		},
		accepts: 'application/javascript, application/json',
		getIdentity: function (object) {
			return object[this.idProperty];
		},
		put: function (object, options) {
			options = options || {};
			var id = 'id' in options ? options.id : this.getIdentity(object),
				hasId = typeof id !== 'undefined',
				headers = lang.mixin({
					'Content-Type': 'application/json',
					Accept: this.accepts,
					'If-Match': options.overwrite === true ? '*' : null,
					'If-Match-None': options.overwrite === false ? '*' : null
				}, this.headers, options.headers);
			return request[hasId && !options.incremental ? 'put' : 'post'](getTarget(this, id), {
				responseType: 'json',
				data: JSON.stringify(object),
				headers: headers
			});
		},
		/* add: inherited, */
		remove: function (id, options) {
			return request['delete'](getTarget(this, id), {
				headers: lang.mixin({}, this.headers, options && options.headers)
			});
		},
		query: function (query, options) {
			options = options || {};
			var headers = lang.mixin({ Accept: this.accepts }, this.headers, options.headers),
				hasQuestionMark = !!~this.target.indexOf('?');

			if (query && typeof query === 'object') {
				query = (query = ioQuery.objectToQuery(query)) ? (hasQuestionMark ? '&' : '?') + query : '';
			}
			if (options.start >= 0 || options.count >= 0) {
				headers['X-Range'] = 'items=' + (options.start || '0') + '-'
					+ (('count' in options && options.count !== Infinity) ? (options.count
						+ (options.start || 0) - 1): '');
				if (this.rangeParam) {
					query += (query || hasQuestionMark ? '&' : '?') + this.rangeParam + '=' + headers['X-Range'];
					hasQuestionMark = true;
				}
				else {
					headers.Range = headers['X-Range'];
				}
			}
			if (options.sort) {
				var sortParam = this.sortParam;
				query += (query || hasQuestionMark ? '&' : '?') + (sortParam ? sortParam + '=' : 'sort(');
				for (var i = 0, l = options.sort.length; i < l; i++) {
					var sort = options.sort[i];
					query += (i > 0 ? ',' : '') + (sort.descending ? this.descendingPrefix : this.ascendingPrefix)
						+ encodeURIComponent(sort.attribute);
				}
				if (!sortParam) {
					query += ')';
				}
			}
			var results = request.get(this.target + (query || ''), {
				responseType: 'json',
				headers: headers
			});
			results.total = results.then(function (response) {
				var range = response && response.getHeader('Content-Range');
				if (!range) {
					range = response && response.getHeader('X-Content-Range');
				}
				return range && (range = range.match(/\/(.*)/)) && +range[1];
			});
			return queryResults(results);
		}
	});
});