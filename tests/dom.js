define([
	'intern!tdd',
	'intern/chai!assert',
	'../dom',
	'../doc',
	'../has',
	'../lang'
], function (test, assert, dom, doc, has, lang) {

	// Currently these tests don't work against the pseudo DOM

	function getIframeDoc(iframeNode) {
		if (iframeNode.contentDocument) {
			return iframeNode.contentDocument;
		}
		var name = iframeNode.name;
		if (name) {
			var iframes = doc.getElementsByTagName('iframe');
			if (iframeNode.document && iframes[name].contentWindow && iframes[name].contentWindow.document) {
				return iframes[name].contentWindow.document;
			}
			else if (doc.frames[name] && doc.frames[name].document) {
				return doc.frames[name].document;
			}
		}
		return null;
	}

	test.suite('dom.parseSelector()', function () {
		test.test('basic', function () {
			var result = dom.parseSelector('div');

			assert.equal('div', result.tag);
			assert.equal(0, result.classes.length);

			result = dom.parseSelector(':hover');

			assert.isUndefined(result.tag);
			assert.deepEqual({ hover: true }, result.pseudoSelectors);

			result = dom.parseSelector(':attach(something)');

			assert.isUndefined(result.tag);
			assert.deepEqual({ attach: 'something' }, result.pseudoSelectors);
		});
	});

});