define([
	'intern!tdd',
	'intern/chai!assert',
	'../../../dom/remove',
	'../../../doc'
], function (test, assert, remove, doc) {
	test.suite('core/dom/remove', function () {
		test.test('basic', function () {
			var div = doc.body.appendChild(doc.createElement('div')),
				p = div.appendChild(doc.createElement('p')),
				p2 = div.appendChild(doc.createElement('p'));
			p.setAttribute('id', 'someId');
			assert.strictEqual(p, div.firstChild);
			remove(p);
			assert.strictEqual(p2, div.firstChild);
			div.appendChild(p);
			assert.strictEqual(p, p2.nextSibling);
			remove('someId');
			assert.isNull(p2.nextSibling);
		});
	});
});