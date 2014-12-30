define([
	'./lang',
	'./WeakMap'
], function (lang, WeakMap) {
	'use strict';

	var entriesWeakMap = new WeakMap(),
		defaultValueWeakMap = new WeakMap(),
		noop = function () {};

	/**
	 * A class that provides a mechanism to register values based upon a test and be able to retrieve them later.
	 * @param {Any} defaultValue This will be the default value if no match if found.  If none is supplied and an
	 *                           attempt is made to find a match but none is found, `.match()` will then throw an error.
	 */
	function Registry(defaultValue) {
		entriesWeakMap.set(this, []);
		defaultValueWeakMap.set(this, defaultValue);
	}

	Registry.prototype = {
		/**
		 * The method for retrieving a registered value or default value.
		 * @param  {Any...} args... Any number of arguments which are then passed to any of the registered tests.
		 * @return {Any}            The value of the match.  If no match is found and there is no default value, this
		 *                          method will throw.
		 */
		match: function (/* args... */) {
			var args = Array.prototype.slice.call(arguments),
				entries = entriesWeakMap.get(this).slice(0),
				entry;

			for (var i = 0; (entry = entries[i]); ++i) {
				if (entry.test.apply(null, args)) {
					return entry.value;
				}
			}

			if (defaultValueWeakMap.get(this) !== undefined) {
				return defaultValueWeakMap.get(this);
			}

			throw new Error('No match found');
		},

		/**
		 * Register a test function, that if matched then returns the registered value.
		 * @param  {Function} test   The function to test if there is a match.  The function needs to return a truthy
		 *                           value to be true, otherwise it needs to return a falsey.
		 * @param  {Any}      value  The value to be returned if there is a match.
		 * @param  {Boolean}  first? Determines if the test is placed at the top of the stack.  Test are run first to
		 *                           last and as soon as there is a match, testing stops.  If `true` then the value is
		 *                           placed first, if `false`, the value is placed last. Defaults to `false`.
		 * @return {Object}          Returns a handle with a `.remove()` function that can be used to remove the entry
		 *                           from the stack.
		 */
		register: function (test, value, first) {
			console.log('register.this', this);
			var entries = entriesWeakMap.get(this),
				entry = {
					test: test,
					value: value
				};

			entries[first ? 'unshift' : 'push'](entry);

			return {
				remove: function () {
					this.remove = noop;
					lang.spliceFromArray(entries, entry);
					test = value = entries = entry = null;
				}
			};
		}
	};

	return Registry;
});