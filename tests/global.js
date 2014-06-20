define([
	'intern!tdd',
	'intern/chai!assert',
	'../global'
], function (test, assert, global) {
	/* jshint node:true */
	/* global _testValue: true */

	test.suite('core/global', function () {
		test.test('basic', function () {
			assert(global);
			var isBrowser = typeof window !== 'undefined' && typeof location !== 'undefined' &&
					document !== 'undefined' && window.location === location &&
					window.document === document;
			var isNode = typeof process === 'object' && process.versions && process.versions.node &&
					process.versions.v8;

			_testValue = 'foo';

			assert.equal(global._testValue, 'foo');

			if (isBrowser) {
				assert.equal(global, window);
			}
			if (isNode) {
				assert.typeOf(global, 'object');
				assert(global.process);
			}
		});
	});
});