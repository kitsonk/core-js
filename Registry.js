define([
	'./lang',
	'./SideTable'
], function (lang, SideTable) {
	'use strict';

	var entriesSideTable = new SideTable(),
		defaultValueSideTable = new SideTable(),
		noop = function () {};

	function Registry(defaultValue) {
		entriesSideTable.set(this, []);
		defaultValueSideTable.set(this, defaultValue);
	}

	Registry.prototype = {
		match: function (/* args... */) {
			var args = Array.prototype.slice.call(arguments),
				entries = entriesSideTable.get(this).slice(0),
				entry;

			for (var i = 0; (entry = entries[i]); ++i) {
				if (entry.test.apply(null, args)) {
					return entry.value;
				}
			}

			if (defaultValueSideTable.get(this) !== undefined) {
				return defaultValueSideTable.get(this);
			}

			throw new Error('No match found');
		},
		register: function (test, value, first) {
			var entries = entriesSideTable.get(this),
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