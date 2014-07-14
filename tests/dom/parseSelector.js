define([
	'intern!tdd',
	'intern/chai!assert',
	'../../dom/parseSelector'
], function (test, assert, parseSelector) {
	test.suite('core/dom/parseSelector', function () {
		test.test('basic', function () {
			var result = parseSelector('div');

			assert.equal('div', result.tag);
			assert.equal(0, result.classes.length);

			result = parseSelector(':hover');

			assert.isUndefined(result.tag);
			assert.deepEqual({ hover: true }, result.pseudoSelectors);

			result = parseSelector(':attach(something)');

			assert.isUndefined(result.tag);
			assert.deepEqual({ attach: 'something' }, result.pseudoSelectors);
		});
	});
});