define([
	'./doc',
	'./WeakMap',
	'./dom/add',
	'./dom/get',
	'./dom/matches',
	'./dom/parseSelector',
	'./dom/query',
	'./dom/remove'
], function (doc, WeakMap, add, get, matches, parseSelector, query, remove) {
	'use strict';

	var domWeakMap = new WeakMap(),
		namespaces = false;

	var descriptors = {
		get: {
			value: get,
			enumerable: true
		},
		add: {
			value: add,
			enumerable: true
		},
		modify: {
			// TODO: Complete modify!!!
			value: add,
			enumerable: true
		},
		query: {
			value: query,
			enumerable: true
		},
		matches: {
			value: matches,
			enumerable: true
		},
		remove: {
			value: remove,
			enumerable: true
		},
		parseSelector: {
			value: parseSelector,
			enumerable: true
		},
		defaultTag: {
			value: 'div',
			writable: true,
			enumerable: true
		},
		addNamespace: {
			value: function (name, uri) {
				(namespaces || (namespaces = {}))[name] = uri;
			},
			enumerable: true
		},
		doc: {
			value: doc,
			writable: true,
			enumerable: true
		}
	};

	var proto = Object.create(Object.prototype, descriptors);

	function Dom(doc) {
		this.doc = doc;
	}

	proto.constructor = Dom;

	Dom.prototype = proto;

	var dom = function (doc) {
		var d;
		if (domWeakMap.has(doc)) {
			return domWeakMap.get(doc);
		}
		else {
			d = new Dom(doc);
			domWeakMap.set(doc, d);
			return d;
		}
	};

	Object.defineProperties(dom, descriptors);
	dom.prototype = proto;

	domWeakMap.set(doc, dom);

	return dom;
});