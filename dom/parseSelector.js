define([
], function () {
	'use strict';

	var selectorParserRE = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w%$|]+)?(?:\[([^\]=]+)=?['"]?([^\]'"]*)['"]?\])?(?::([-\w]+)(?:\(([^\)]+)\))?)?/g;

	return function parseSelector(selector) {
		var combinator,
			tag,
			id,
			classes = [],
			pseudoSelectors = {},
			attributes = {};

		function parser(t, comb, prefix, value, attrName, attrValue, pseudoName, pseudoValue) {
			if (comb) {
				combinator = comb;
			}
			if (prefix) {
				if (prefix === '#') {
					id = value;
				}
				else {
					classes.push(value);
				}
			}
			else if (value) {
				tag = value;
			}
			if (attrName) {
				attributes[attrName] = attrValue;
			}
			if (pseudoName) {
				pseudoSelectors[pseudoName] = pseudoValue || true;
			}
		}

		selector.replace(selectorParserRE, parser);

		return {
			combinator: combinator,
			tag: tag,
			id: id,
			classes: classes,
			pseudoSelectors: pseudoSelectors,
			attributes: attributes
		};
	};
});