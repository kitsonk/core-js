define([
	'intern!tdd',
	'intern/chai!assert',
	'../../../dom/useRoot'
], function (test, assert, useRoot) {
	test.suite('core/dom/useRoot', function () {
		test.test('basic', function () {
			var div = document.body.appendChild(document.createElement('div')),
				p = div.appendChild(document.createElement('p')),
				qsa = div.querySelectorAll;
			p.appendChild(document.createElement('span'));

			assert.equal(qsa.call(p, 'div span').length, 1);
			assert.equal(useRoot(p, 'div span', qsa).length, 0);
		});
		test.test('with id', function () {
			var div = document.body.appendChild(document.createElement('div')),
				p = div.appendChild(document.createElement('p')),
				qsa = div.querySelectorAll;

			p.appendChild(document.createElement('span'));
			p.setAttribute('id', 'test_p');

			assert.equal(useRoot(p, 'div span', function (query) {
				assert.equal(p.id, 'test_p');
				return qsa.call(this, query);
			}).length, 0);
		});
		test.test('without id', function () {
			var div = document.body.appendChild(document.createElement('div')),
				p = div.appendChild(document.createElement('p')),
				qsa = div.querySelectorAll;

			p.appendChild(document.createElement('span'));

			assert.equal(p.id, '');

			assert.equal(useRoot(p, 'div span', function (query) {
				assert(p.id.length);
				return qsa.call(this, query);
			}).length, 0);

			assert.equal(p.id, '');
		});
	});
});