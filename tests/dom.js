define([
	'intern!tdd',
	'intern/chai!assert',
	'../dom',
	'../doc',
	'../has',
	'./dom/all'
], function (test, assert, dom, doc, has) {

	// Currently these tests don't work against the pseudo DOM
	
	function emptyDom(root) {
		root = root || doc.body;
		while (root.firstChild) {
			root.removeChild(root.firstChild);
		}
		return root;
	}

	function setQueryTestDom(root) {
		root = root || doc.body;
		root.className = 'upperclass';
		root.innerHTML = '		<h1>Testing core/dom</h1>' +
			'		<iframe id="t3" name="t3" src="../tests/resources/blank.html"></iframe>';
	}

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

	test.suite('core/dom', function () {
		if (has('host-browser')) {
			test.test('cross document query', function () {
				emptyDom();
				setQueryTestDom();
				var t3 = window.frames.t3,
					t3Doc = getIframeDoc(t3);
				t3Doc.open();
				t3Doc.write('<html><head>' +
					'<title>inner document</title>' +
					'</head>' +
					'<body>' +
					'<div id="st1"><h3>h3 <span>span <span> inner <span>inner-inner</span></span></span> endh3 </h3></div>' +
					'</body>' +
					'</html>');
				var t3Dom = dom(t3Doc);
				var st1 = t3Dom.get('st1');
				assert.equal(1, t3Dom.query('h3').length);
				assert.equal(1, t3Dom.query(st1, 'h3').length);
				// use a long query to force a test of the XPath system on FF.
				assert.equal(1, t3Dom.query(st1, 'h3 > span > span > span').length);
				assert.equal(1, t3Dom.query(t3Doc.body.firstChild, 'h3 > span > span > span').length);
			});
		}
	});

});