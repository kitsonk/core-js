define([
	'./get'
], function (get) {
	'use strict';

	/**
	 * Removes a DOM Node from the DOM but disconnecting it from its parent.
	 * @param  {DOMNode|String} node The target DOM Node to be removed or a string representing its ID
	 */
	return function remove(node) {
		var parentNode;
		node = get(node);
		if (node && (parentNode = node.parentNode)) {
			parentNode.removeChild(node);
		} // TODO: should this throw?
	};
});