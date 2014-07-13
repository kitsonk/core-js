define([
	'../doc'
], function (doc) {
	'use strict';

	var fragmentFasterHeuristicRE = /[-+,> ]/,
		selectorRE = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w%$|]+)?(?:\[([^\]=]+)=?['"]?([^\]'"]*)['"]?\])?/g,

		namespaces = false,
		namespaceIndex;

	function insertTextNode(doc, node, text) {
		node.appendChild(doc.createTextNode(text));
	}
	
	var add = function (node/*, selectors...*/) {
		var args = arguments,
			// use the first argument as the default return value in case only a DOM Node is passed in
			returnValue = node,
			argument;

		var thisDoc = (this && this.doc) || doc,
			fragment,
			referenceNode,
			currentNode,
			nextSibling,
			lastSelectorArg,
			leftoverCharacters;

		function insertLastNode() {
			if (currentNode && referenceNode && currentNode !== referenceNode) {
				(referenceNode === node &&
					(fragment ||
						(fragment = fragmentFasterHeuristicRE.test(argument) && thisDoc.createDocumentFragment()))
						|| referenceNode).insertBefore(currentNode, nextSibling || null);
			}
		}

		function parseSelector(t, combinator, prefix, value, attrName, attrValue) {
			var currentNodeClassName,
				removed,
				method;

			if (combinator) {
				insertLastNode();
				if (combinator === '-' || combinator === '+') {
					// TODO: add support for a >- as a means of indicating before the next child?
					referenceNode = (nextSibling = (currentNode || referenceNode)).parentNode;
					currentNode = null;
					if (combinator === '+') {
						nextSibling = nextSibling.nextSibling;
					}
					// else a - operator, again not in CSS, but obvious in it's meaning (create next element before
					// the currentNode/referenceNode)
				}
				else {
					if (combinator === '<') {
						referenceNode = currentNode = (currentNode || referenceNode).parentNode;
					}
					else {
						if (combinator === ',') {
							referenceNode = node;
						}
						else if (currentNode) {
							referenceNode = currentNode;
						}
						currentNode = null;
					}
					nextSibling = 0;
				}
				if (currentNode) {
					referenceNode = currentNode;
				}
			}
			var tag = !prefix && value;
			if (tag || (!currentNode && (prefix || attrName))) {
				if (tag === '$') {
					insertTextNode(thisDoc, referenceNode, args[++i]);
				}
				else {
					tag = tag || (this && this.defaultTag) || 'div';
					currentNode = namespaces && ~(namespaceIndex = tag.indexOf('|')) ?
						thisDoc.createElementNS(namespaces[tag.slice(0, namespaceIndex)],
							tag.slice(namespaceIndex + 1)) : thisDoc.createElement(tag);
				}
			}
			if (prefix) {
				if (value === '$') {
					value = args[++i];
				}
				if (prefix === '#') {
					currentNode.id = value;
				}
				else {
					currentNodeClassName = currentNode.className;
					removed = currentNodeClassName && (' ' + currentNodeClassName + ' ')
						.replace(' ' + value + ' ', ' ');
					if (prefix === '.') {
						currentNode.className = currentNodeClassName ? (removed + value).substring(1) : value;
					}
					else {
						if (argument === '!') {
							currentNode.parentNode.removeChild(currentNode);
						}
						else {
							removed = removed.substring(1, removed.length - 1);
							if (removed !== currentNodeClassName) {
								currentNode.className = removed;
							}
						}
					}
				}
			}
			if (attrName) {
				if (attrValue === '$') {
					attrValue = args[++i];
				}
				if (attrName === 'style') {
					currentNode.style.cssText = attrValue;
				}
				if (attrName === 'content' || attrName === '!content') {
					while (currentNode.firstChild !== null) {
						currentNode.removeChild(currentNode.firstChild);
					}
					if (attrName === 'content') {
						currentNode.appendChild(doc.createTextNode(attrValue));
					}
				}
				else {
					method = attrName.charAt(0) === '!' ? (attrName = attrName.substring(1)) && 'removeAttribute'
						: 'setAttribute';
					attrValue = attrValue === '' ? attrName : attrValue;
					namespaces && ~(namespaceIndex = attrName.indexOf('|')) ?
						currentNode[method + 'NS'](namespaces[attrName.slice(0, namespaceIndex)],
							attrName.slice(namespaceIndex + 1), attrValue) :
						currentNode[method](attrName, attrValue);
				}
			}
			return '';
		}

		var i = 0,
			key;
		for (; i < args.length; i++) {
			argument = args[i];
			if (typeof argument === 'object') {
				lastSelectorArg = false;
				if (argument instanceof Array) {
					// an Array
					currentNode = thisDoc.createDocumentFragment();
					var self = this;
					argument.forEach(function (item) {
						currentNode.appendChild(add.call(self, item));
					});
					argument = currentNode;
				}
				if (argument.nodeType) {
					currentNode = argument;
					insertLastNode();
					referenceNode = argument;
					nextSibling = 0;
				}
				else {
					// an object hash
					for (key in argument) {
						currentNode[key] = argument[key];
					}
				}
			}
			else if (lastSelectorArg) {
				lastSelectorArg = false;
				insertTextNode(thisDoc, currentNode, argument);
			}
			else {
				if (i < 1) {
					node = null;
				}
				lastSelectorArg = true;
				leftoverCharacters = argument.replace(selectorRE, parseSelector);
				if (leftoverCharacters) {
					throw new SyntaxError('Unexpected char "' + leftoverCharacters + '" in "' + argument + '"');
				}
				insertLastNode();
				referenceNode = returnValue = currentNode || referenceNode;
			}
		}
		if (node && fragment) {
			node.appendChild(fragment);
		}
		return returnValue;
	};

	add.namespace = function (name, uri) {
		(namespaces || (namespaces = {}))[name] = uri;
	};

	return add;
});