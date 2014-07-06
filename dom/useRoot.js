define([
], function () {
	'use strict';

	var unionSplit = /([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g,
		uid = '__ur' + (1e9 * Math.random() >>> 0) + '__';

	/**
	 * Execute a DOM query against a particular context
	 * @param  {DOMNode}  context The "root" of where the query is relative to
	 * @param  {String}   query   The query to be bound to the root
	 * @param  {Function} method  The method to be executed against the query
	 * @return {Mixed}            The return of the method
	 */
	return function useRoot(context, query, method) {
		var oldContext = context,
			oldId = context.getAttribute('id'),
			newId = oldId || uid,
			hasParent = context.parentNode,
			relativeHierarchySelector = /^\s*[+~]/.test(query);

		if (relativeHierarchySelector && !hasParent) {
			// This is a bad query that won't ever return anything so lets not waste any more time.
			return [];
		}
		if (!oldId) {
			context.setAttribute('id', newId);
		}
		else {
			newId = newId.replace(/'/g, '\\$&');
		}
		if (relativeHierarchySelector) {
			context = context.parentNode;
		}
		var selectors = query.match(unionSplit);
		for (var i = 0; i < selectors.length; i++) {
			selectors[i] = '[id="' + newId + '"] ' + selectors[i];
		}
		query = selectors.join(',');

		try {
			return method.call(context, query);
		}
		finally {
			if (!oldId) {
				oldContext.removeAttribute('id');
			}
		}
	};

});