define([
	'../doc',
	'../on',
	'./add',
	'./get',
	'./modify',
	'./remove',
	'./useRoot'
], function (doc, on, add, get, modify, remove, useRoot) {
	'use strict';

		// This matches query selectors that are faster to handle via other methods than qSA
	var fastPathRE = /^([\w]*)#([\w\-]+$)|^(\.)([\w\-\*]+$)|^(\w+$)/;

	var slice = Array.prototype.slice;

	var nodeListDescriptors = {
		on: {
			value: function (type, listener) {
				var handles = this.map(function (node) {
					return on(node, type, listener);
				});
				handles.remove = function remove() {
					handles.forEach(function (handle) {
						handle.remove();
					});
				};
				return handles;
			},
			configurable: true
		},
		add: {
			value: function (/* selectors... */) {
				var self = this,
					args = slice.call(arguments);
				return decorate.call(self, self.map(function (node) {
					return add.apply(self, [ node ].concat(args));
				}));
			},
			configurable: true
		},
		modify: {
			value: function (/* selectors... */) {
				var self = this,
					args = slice.call(arguments);
				return self.map(function (node) {
					return modify.apply(self, [ node ].concat(args));
				});
			},
			configurable: true
		},
		query: {
			value: function (/* selectors... */) {
				var self = this,
					args = slice.call(arguments),
					results = [];
				self.forEach(function (node) {
					results = results.concat(query.apply(self, [ node ].concat(args)));
				});
				return decorate(results);
			},
			configurable: true
		},
		remove: {
			value: function () {
				this.forEach(function (node) {
					remove(node);
				});
			},
			configurable: true
		}
	};

	/**
	 * Add syntactic sugar to arrays of DOMNodes that are returned from other types of operatives to be used in
	 * chaining.
	 * @param  {Array(DOMNodes)} nodes The array of DOMNodes that should be decorated.
	 * @return {Array}                 The array with `.on()`, `.add()`, `.modify()`, `.query()`, and `.remove()` added
	 *                                 to it.
	 */
	function decorate(nodes) {
		if (!nodes) {
			return nodes;
		}
		Object.defineProperties(nodes, nodeListDescriptors);
		if (this && this.doc) {
			Object.defineProperty(nodes, 'doc', {
				value: this.doc,
				configurable: true
			});
		}
		return nodes;
	}

	/**
	 * Query the DOM with CSS selectors to identify a list of DOM Nodes that match the provided selectors.  If one of
	 * the arguments passed is a DOM Node, then it becomes the root of subsequent selectors.  If a DOM Node is
	 * omitted, the current document becomes the root.
	 * @param {String|Object...} selectors Any combination of strings or objects that are used to query the DOM
	 * @return {Array(DOMNodes)}           An array of DOM Nodes that are decorated with some additional methods for
	 *                                     further manipulation.
	 */
	function query(/*selectors...*/) {
		var args = arguments,
			argument,
			results = [],
			self = this,
			thisDoc = self && self.doc ? self.doc : doc,
			node = thisDoc,
			fastPath,
			fastPathResults,
			i;

		function fastPathQuery(root, selectorMatch) {
			var parent,
				found;

			if (selectorMatch[2]) {
				// Looks like we are selecting and ID
				found = get.call(self, selectorMatch[2]);
				if (!found || (selectorMatch[1] && selectorMatch[1] !== found.tagName.toLowerCase())) {
					// Either ID wasn't found or there was a tag qualified it didn't match
					return [];
				}
				if (root !== thisDoc) {
					// There is a root element, let's make sure it is in the ancestry try
					parent = found;
					while (parent !== node) {
						parent = parent.parentNode;
						if (!parent) {
							// Ooops, silly person tried selecting an ID that isn't a descendent of the root node
							return [];
						}
					}
				}
				// if there is part of the selector that hasn't been resolved, then we have to pass it back to
				// query to further resolve, otherwise we append it to the results
				return selectorMatch[3] ? query(found, selectorMatch[3]) : [ found ];
			}
			if (selectorMatch[3] && root.getElementsByClassName) {
				// a .class selector
				return slice.call(root.getElementsByClassName(selectorMatch[4]));
			}
			if (selectorMatch[5]) {
				// a tag
				return slice.call(root.getElementsByTagName(selectorMatch[5]));
			}
		}

		for (i = 0; i < args.length; i++) {
			argument = args[i];
			if ((typeof argument === 'object' && argument && argument.nodeType) || !argument) {
				// this argument is a node and is now the subject of subsequent selectors
				node = argument;
				continue;
			}
			if (!node) {
				// There is no subject node at the moment, continue consuming arguments
				continue;
			}
			if (typeof argument === 'string') {
				// It is assumed all strings are selectors
				fastPath = fastPathRE.exec(argument);
				if (fastPath) {
					// Quicker to not use qSA
					fastPathResults = fastPathQuery(node, fastPath);
				}
				if (fastPathResults) {
					// There were results returned from fastPathQuery
					results = results.concat(fastPathResults);
				}
				else {
					// qSA should be faster
					if (node === thisDoc) {
						// This is a non-rooted query, just use qSA
						results = results.concat(slice.call(node.querySelectorAll(argument)));
					}
					else {
						// This is a rooted query, and qSA is really strange in its behaviour, in that it will return
						// nodes that match the selector, irrespective of the context of the root node
						results = results.concat(slice.call(useRoot(node, argument, node.querySelectorAll)));
					}
				}
			}
			else if (argument) {
				throw new TypeError('Invalid argument type of: "' + typeof argument + '"');
			}
		}

		return decorate.call(this, results);
	}

	query.decorate = decorate;

	return query;
});