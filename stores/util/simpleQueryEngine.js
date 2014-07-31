define([], function () {
	'use strict';
	
	return function (query, options) {
		switch (typeof query) {
		case 'object':
		case 'undefined':
			var queryObject = query;
			query = function (object) {
				for (var key in queryObject) {
					var required = queryObject[key];
					if (required && required.test) {
						if (!required.test(object[key], object)) {
							return false;
						}
					}
					else if (required !== object[key]) {
						return false;
					}
				}
				return true;
			};
			break;
		case 'string':
			if (!this[query]) {
				throw new Error('No filter function "' + query + '" was found in store');
			}
			query = this[query];
			break;
		case 'function':
			break;
		default:
			throw new Error('Cannot query with a type of ' + typeof query);
		}

		function execute(array) {
			var results = array.filter(query),
				sortSet = options && options.sort;

			if (sortSet) {
				results.sort(typeof sortSet === 'function' ? sortSet : function (a, b) {
					var aValue, bValue;
					for (var sort, i = 0; sort = sortSet[i]; i++) {
						aValue = a[sort.attribute];
						bValue = b[sort.attribute];
						aValue = aValue !== null ? aValue.valueOf() : aValue;
						bValue = bValue !== null ? bValue.valueOf() : bValue;
						if (aValue !== bValue) {
							return !!sort.descending === (aValue === null || aValue > bValue) ? -1 : 1;
						}
					}
					return 0;
				});
			}
			if (options && (options.start || options.count)) {
				var total = results.length;
				results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
				results.total = total;
			}
			return results;
		}
		execute.matches = query;
		return execute;
	};
});