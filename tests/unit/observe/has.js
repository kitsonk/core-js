define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/has',
	'../../../observe/has!es7-object-observe?../resources/module1',
	'../../../observe/has!es7-array-observe?../resources/module2'
], function (registerSuite, assert, has, module1, module2) {
	registerSuite({
		name: 'core/observe/has',
		'feature detection': function () {
			if (typeof Object.observe === 'function') {
				assert.isTrue(has('es7-object-observe'));
				assert(module1);
			}
			else {
				assert.isFalse(has('es7-object-observe'));
				assert.isUndefined(module1);
			}
			if (typeof Array.observe === 'function') {
				assert.isTrue(has('es7-array-observe'));
				assert(module2);
			}
			else {
				assert.isFalse(has('es7-array-observe'));
				assert.isUndefined(module2);
			}
		}
	});
});