define([
	'intern!tdd',
	'intern/chai!assert',
	'../has'
], function (test, assert, has) {
	'use strict';

	/* jslint node:true */

	test.suite('core/has', function () {
		test.test('it exists', function () {
			assert(has);
			assert(typeof has === 'function');
		});
		test.test('has()', function () {
			var isBrowser = typeof window !== 'undefined' &&
					typeof location !== 'undefined' &&
					typeof document !== 'undefined' &&
					window.location === location && window.document === document;
			if (isBrowser) {
				assert.isTrue(has('host-browser'));
			}
			else {
				assert.isFalse(has('host-browser'));
			}
			if (typeof process === 'object' && process.versions && process.versions.node && process.versions.v8) {
				assert(has('host-node'));
			}
			else {
				assert.isFalse(has('host-node'));
			}
		});
		test.test('has.add()', function () {
			var lazyTest = false;
			has.add('test-feature', function (global, doc, element) {
				assert(global);
				if (has('host-browser')) {
					assert(doc);
					assert(element);
				}
				lazyTest = true;
				return true;
			});
			assert.isFalse(lazyTest);
			assert.isTrue(has('test-feature'));
			assert.isTrue(lazyTest);

			assert.isUndefined(has(999));
			has.add(999, true);
			assert.isTrue(has(999));

			lazyTest = false;
			has.add('test-feature2', function () {
				lazyTest = true;
			}, true);
			assert.isTrue(lazyTest);
		});
		test.test('cached', function () {
			var lazyTest = false;
			has.add('test-feature3', function () {
				/* jshint boss:true */
				return lazyTest = true;
			});
			assert.isTrue(has('test-feature3'));
			lazyTest = false;
			assert.isTrue(has('test-feature3'));
			assert.isFalse(lazyTest);
		});
		test.test('loader module', function () {
			var dfd = this.async(100);
			require([ 'core/has!dom?core/tests/resources/module1:core/tests/resources/module2' ],
				dfd.callback(function (module) {
					if (has('dom')) {
						assert.equal(module, 'module1');
					}
					else {
						assert.equal(module, 'module2');
					}
				}));
		});
	});
});