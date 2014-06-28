define([
	'require',
	'module',
	'./global'
], function (require, module, global) {
	'use strict';

	/**
	 * A feature detection module.
	 * @exports core/has
	 */

	/* jshint node:true */

	// try to pull the has implementation from the loader; both the dojo loader and bdLoad provide one
	// if using a foreign loader, then the has cache may be initialized via the config object for this module
	// WARNING: if a foreign loader defines require.has to be something other than the has.js API, then this
	// implementation fail
	
	/**
	 * Return the current value of the named feature.
	 * @param  {String|Integer} name The name (if a string) or identifier (if an integer) of the feature to test.
	 * @return {Boolean}             Returns the value of the feature named by name. The feature must have been
	 *                               previously added to the cache by has.add.
	 */
	var has = require.has || function () {};

	if (!has('dojo-has-api')) {
		var isBrowser =
				// the most fundamental decision: are we in the browser?
				typeof window !== 'undefined' &&
				typeof location !== 'undefined' &&
				typeof document !== 'undefined' &&
				window.location === location && window.document === document,

			// has API variables
			doc = isBrowser && document,
			element = doc && doc.createElement('DiV'),
			cache = (module.config && module.config()) || {};

		has = function (name) {
			return typeof cache[name] === 'function' ? (cache[name] = cache[name](global, doc, element)) : cache[name];
		};

		has.cache = cache;

		/**
		 * Register a new feature test for some named feature.
		 * @param {String|Integer} name  The name (if a string) or identifier (if an integer) of the feature to test.
		 * @param {Function} test  A test function to register. If a function, queued for testing until actually needed.
		 *                         The test function should return a boolean indicating the presence of a feature or
		 *                         bug.
		 * @param {Boolean?} now   Optional. Omit if `test` is not a function. Provides a way to immediately run the
		 *                         test and cache the result.
		 * @param {Boolean?} force Optional. If the test already exists and force is truthy, then the existing test
		 *                         will be replaced; otherwise, add does not replace an existing test (that is, by
		 *                         default, the first test advice wins).
		 * @return {Boolean}       Returns the value of the test, if `now` is `true`.
		 */
		has.add = function (name, test, now, force) {
			(typeof cache[name] === 'undefined' || force) && (cache[name] = test);
			return now && has(name);
		};

		// since we're operating under a loader that doesn't provide a has API, we must explicitly initialize
		// has as it would have otherwise been initialized by the dojo loader; use has.add to the builder
		// can optimize these away if desired
		has.add('host-browser', isBrowser);
		has.add('host-node', (typeof process === 'object' && process.versions && process.versions.node &&
			process.versions.v8));
		has.add('host-rhino', (typeof load === 'function' && (typeof Packages === 'function' ||
			typeof Packages === 'object')));
		has.add('dom', isBrowser);
		has.add('dojo-dom-ready-api', 1);
		has.add('dojo-sniff', 1);
	}

	if (has('host-browser')) {
		// Common application level tests
		has.add('dom-addeventlistener', !!document.addEventListener);

		// Do the device and browser have touch capability?
		has.add('touch', 'ontouchstart' in document || navigator.maxTouchPoints || window.navigator.msMaxTouchPoints);

		// Touch events support
		has.add('touch-events', 'ontouchstart' in document);

		// Pointer Events support
		has.add('pointer-events', 'maxTouchPoints' in navigator);
		has.add('MSPointer', 'msMaxTouchPoints' in navigator); //IE10 (+IE11 preview)

		// I don't know if any of these tests are really correct, just a rough guess
		/* global innerWidth:true */
		has.add('device-width', screen.availWidth || innerWidth);

		// Tests for DOMNode.attributes[] behaviour:
		//	 - dom-attributes-explicit - attributes[] only lists explicitly user specified attributes
		//	 - dom-attributes-specified-flag (IE8) - need to check attr.specified flag to skip attributes user didn't
		//		specify
		//	 - Otherwise, in IE6-7. attributes[] will list hundreds of values, so need to do outerHTML to get attrs
		//		instead.
		var form = document.createElement('form');
		has.add('dom-attributes-explicit', form.attributes.length === 0); // W3C
		has.add('dom-attributes-specified-flag', form.attributes.length > 0 && form.attributes.length < 40);	// IE8
	}

	/**
	 * Deletes the contents of the element passed to test functions.
	 * @param  {DOMElement} element The DOM element to clear
	 * @return {DOMElement}         The element
	 */
	has.clearElement = function (element) {
		element.innerHTML = '';
		return element;
	};

	/**
	 * Resolves id into a module id based on possibly-nested ternary expression that branches on has test value(s).
	 * @param  {String} id       The module ID being passed in
	 * @param  {Function} toAbsMid Resolves a relative MID into an absolute MID
	 * @return {String}          The normalised MID
	 */
	has.normalize = function (id, toAbsMid) {
		var tokens = id.match(/[\?:]|[^:\?]*/g),
			i = 0,
			get = function (skip) {
				var term = tokens[i++];
				if (term === ':') {
					// empty string module name, resolves to 0
					return 0;
				}
				else {
					// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
					if (tokens[i++] === '?') {
						if (!skip && has(term)) {
							// matched the feature, get the first value from the options
							return get();
						}
						else {
							// did not match, get the second value, passing over the first
							get(true);
							return get(skip);
						}
					}
					// a module
					return term || 0;
				}
			};
		id = get();
		return id && toAbsMid(id);
	};

	/**
	 * Conditional loading of AMD modules based on a has feature test value.
	 * @param  {String}   id            Gives the resolved module id to load.
	 * @param  {Function} parentRequire The loader require function with respect to the module that contained the plugin
	 *                                  resource in its dependency list.
	 * @param  {Function} loaded        Callback to loader that consumes result of plugin demand.
	 */
	has.load = function (id, parentRequire, loaded) {
		if (id) {
			parentRequire([id], loaded);
		}
		else {
			loaded();
		}
	};

	return has;
});