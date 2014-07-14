define([
	'../has',
	'../doc',
	'./useRoot'
], function (has, doc, useRoot) {
	'use strict';

	has.add('dom-element-matches', function (global, doc, element) {
		// This is slightly more robust than what is in dojo/selector/lite in that it returns the function name out of
		// the prototype, which can then be used as a key on Elements directly.

		// Also, currently the has API doesn't recognise the pseudo DOM and therefore the passed arguments to the
		// function to detect the capabilities
		var matchesFunctionName = element && 'matches' in element ? 'matches' : false;
		if (element && !matchesFunctionName) {
			['moz', 'webkit', 'ms', 'o'].some(function (vendorPrefix) {
				return vendorPrefix + 'MatchesSelector' in element ?
					matchesFunctionName = vendorPrefix + 'MatchesSelector' : false;
			});
		}
		return matchesFunctionName;
	});

	var matchesSelector = has('dom-element-matches') ? doc.createElement('div')[has('dom-element-matches')] :
			undefined;

	/**
	 * Returns if a particular node matches a particular selector relative to a context if provided.
	 * @param  {DOMNode}  node     The node to match
	 * @param  {String}   selector The selector to be matched against
	 * @param  {DOMNode?} context  The node of which the match will be relative to
	 * @return {Boolean}           True if the node matches, false if the node doesn't match
	 */
	return function matches(node, selector, context) {
		if (context && context.nodeType !== 9) {
			return useRoot(context, selector, function (query) {
				return matchesSelector.call(node, query);
			});
		}
		return matchesSelector.call(node, selector);
	};

});