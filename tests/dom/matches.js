define([
	'intern!tdd',
	'intern/chai!assert',
	'../../dom/matches'
], function (test, assert, matches) {
	test.suite('core/dom/matches', function () {
		var div = document.body.appendChild(document.createElement('div')),
			p = div.appendChild(document.createElement('p')),
			span = p.appendChild(document.createElement('span'));

		test.test('matching no context', function () {
			assert.isTrue(matches(div, 'div'));
			assert.isTrue(matches(p, 'div > p'));
			assert.isTrue(matches(span, 'div span'));
			assert.isFalse(matches(p, 'div'));
		});

		test.test('matching with context', function () {
			assert.isFalse(matches(span, 'div span', p));
			assert.isTrue(matches(span, 'span', p));
			assert.isFalse(matches(div, 'div', p));
		});
	});
});