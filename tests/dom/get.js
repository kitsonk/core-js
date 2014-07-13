define([
	'intern!tdd',
	'intern/chai!assert',
	'../../dom/get',
	'../../doc',
	'../../lang'
], function (test, assert, get, doc, lang) {

	function emptyDom(root) {
		root = root || doc.body;
		while (root.firstChild) {
			root.removeChild(root.firstChild);
		}
		return root;
	}

	function setGetTestDom(root) {
		root = root || doc.body;
		root.innerHTML = '<h1>testing Core DOM utils: dojo.byId</h1>' +
			'		<form name="foobar">' +
			'			<input type="text" name="baz" value="baz1">' +
			'			<input type="text" name="baz" value="baz2">' +
			'		</form>' +
			'		<form name="dude"></form>' +
			'		<form name="ranch">' +
			'			<input type="text" name="cattle" id="ranch" value="baz1">' +
			'		</form>' +
			'		<form name="ranch2">' +
			'			<input type="text" name="cattle2" value="baz1">' +
			'		</form>' +
			'		<form name="ranch3">' +
			'			<input type="text" name="cattle3" value="baz1">' +
			'			<input type="text" name="cattle3" id="cattle3" value="cattle3">' +
			'		</form>' +
			'		<form name="sea">' +
			'			<input type="text" name="fish" value="fish">' +
			'			<input type="text" name="turtle" value="turtle">' +
			'		</form>' +
			'		<span id="fish">Fish span</span>' +
			'		<form name="lamps">' +
			'			<input type="text" name="id" value="blue">' +
			'		</form>' +
			'		<form name="chairs" id="chairs">' +
			'			<input type="text" name="id" value="recliner">' +
			'		</form>' +
			'		<div id="start">a start node</div>';
	}

	test.suite('dom/get()', function () {
		test.test('basic', function () {
			emptyDom();
			setGetTestDom();
			assert(!get(null), 'get(null)');
			assert(!get(undefined), 'get(undefined)');
			assert(!get('baz'), 'get("baz")');
			assert(!get('foobar'), 'get("foobar")');
			assert(!get('dude'), 'get("dude")');
			assert(!get('cattle'), 'get("cattle")');
			assert(!get('cattle2'), 'get("cattle2")');
			assert(!get('lamps'), 'get("lamps")');
			assert(!get('blue'), 'get("blue")');
			assert(get('chairs'), 'get("chairs")');
			assert(get('ranch'), 'get("ranch")');
			assert(get('cattle3'), 'get("cattle3")');
			assert.equal('span', get('fish').nodeName.toLowerCase());
		});
		test.test('node cloning', function () {
			var startNode = get('start');
			var clonedNode = lang.clone(startNode);
			clonedNode.id = 'clonedStart';
			clonedNode.innerText = 'This is a cloned div';
			doc.body.appendChild(clonedNode);
			assert.equal('This is a cloned div', get('clonedStart').innerText);
		});
	});
});