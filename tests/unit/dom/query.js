define([
	'intern!tdd',
	'intern/chai!assert',
	'../../../dom/query',
	'../../../dom/get',
	'../../../doc',
	'../../../on'
], function (test, assert, query, get, doc, on) {

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
		root.innerHTML = '		<h1>Testing core/dom/query</h1>' +
			'		<p>Something</p>' +
			'		<div id="t" class="lowerclass">' +
			'			<h3>h3 <span>span</span> endh3 </h3>' +
			'			<!-- comment to throw things off -->' +
			'			<div class="foo bar" id="_foo">' +
			'				<h3>h3</h3>' +
			'				<span id="foo"></span>' +
			'				<span></span>' +
			'			</div>' +
			'			<h3>h3</h3>' +
			'			<h3 class="baz foobar" title="thud">h3</h3>' +
			'			<span class="fooBar baz foo"></span>' +
			'			<span foo="bar"></span>' +
			'			<span foo="baz bar thud"></span>' +
			'			<!-- FIXME: should foo="bar-baz-thud" match? [foo$=thud] ??? -->' +
			'			<span foo="bar-baz-thudish" id="silly:id::with:colons"></span>' +
			'			<div id="container">' +
			'				<div id="child1" qux="true"></div>' +
			'				<div id="child2"></div>' +
			'				<div id="child3" qux="true"></div>' +
			'			</div>' +
			'			<div id="silly~id" qux="true"></div>' +
			'			<input id="notbug" name="bug" type="hidden" value="failed"> ' +
			'			<input id="bug" type="hidden" value="passed"> ' +
			'		</div>' +
			'		<div id="t2" class="lowerclass">' +
			'			<input type="checkbox" name="checkbox1" id="checkbox1" value="foo">' +
			'			<input type="checkbox" name="checkbox2" id="checkbox2" value="bar" checked>' +
			'			<input type="radio" disabled="true" name="radio" id="radio1" value="thinger">' +
			'			<input type="radio" name="radio" id="radio2" value="stuff" checked>' +
			'			<input type="radio" name="radio" id="radio3" value="blah">' +
			'		</div>' +
			'		<select id="t2select" multiple="multiple">' +
			'			<option>0</option>' +
			'			<option selected="selected">1</option>' +
			'			<option selected="selected">2</option>' +
			'		</select>' +
			'		<div id="t4">' +
			'			<div id="one" class="subDiv">' +
			'				<p class="one subP"><a class="subA">one</a></p>' +
			'				<div id="two" class="subDiv">' +
			'					<p class="two subP"><a class="subA">two</a></p>' +
			'				</div>' +
			'			</div>' +
			'		</div>' +
			'		<section></section>' +
			'		<div id="other">' +
			'		  <div id="abc55555"></div>' +
			'		  <div id="abd55555efg"></div>' +
			'		  <div id="55555abc"></div>' +
			'		  <div id="1"></div>' +
			'		  <div id="2c"></div>' +
			'		  <div id="3ch"></div>' +
			'		  <div id="4chr"></div>' +
			'		  <div id="5char"></div>' +
			'		  <div id="6chars"></div>' +
			'		</div>' +
			'		<div id="attrSpecialChars">' +
			'			<select name="special">' +
			'				<!-- tests for special characters in attribute values (characters that are part of query' +
				'syntax) -->' +
			'				<option value="a+b">1</option>' +
			'				<option value="a~b">2</option>' +
			'				<option value="a^b">3</option>' +
			'				<option value="a,b">4</option>' +
			'			</select>' +
			'			<!-- tests for quotes in attribute values -->' +
			'			<a href="foo=bar">hi</a>' +
			'			<!-- tests for brackets in attribute values -->' +
			'			<input name="data[foo][bar]">' +
			'			<!-- attribute name with a dot, goes down separate code path -->' +
			'			<input name="foo[0].bar">' +
			'			<input name="test[0]">' +
			'		</div>';
	}

	test.suite('core/dom/query', function () {
		test.test('basic', function () {
			emptyDom();
			setQueryTestDom();
			assert.equal(4, query('h3').length, 'query("h3")');
			assert.equal(1, query('#t').length, 'query("#t")');
			assert.equal(1, query('#bug').length, 'query("#bug")');
			assert.equal(4, query('#t h3').length, 'query("#t h3")');
			assert.equal(1, query('div#t').length, 'query("div#t")');
			assert.equal(4, query('div#t h3').length, 'query("div#t h3")');
			assert.equal(0, query('span#t').length, 'query("span#t")');
			assert.equal(0, query('.bogus').length, 'query(".bogus")');
			assert.equal(0, query(get('container'), '.bogus').length, 'query(container, ".bogus")');
			assert.equal(0, query('#bogus').length, 'query("#bogus")');
			assert.equal(0, query(get('container'), '#bogus').length, 'query(container, "#bogus")');
			assert.equal(1, query('#t div > h3').length, 'query("#t div > h3")');
			assert.equal(2, query('.foo').length, 'query(".foo")');
			assert.equal(1, query('.foo.bar').length, 'query(".foo.bar")');
			assert.equal(2, query('.baz').length, 'query(".baz")');
			assert.equal(3, query('#t > h3').length, 'query("#t > h3")');
			assert.equal(1, query('section').length, 'query("section")');
			assert.equal(0, query(null).length, 'query(null)');
		});
		test.test('syntactic equivalents', function () {
			assert.equal(12, query('#t > *').length, 'query("#t > *")');
			assert.equal(3, query('.foo > *').length, 'query(".foo > *")');
		});
		test.test('rooted queries', function () {
			var container = get('container'),
				t = get('t');
			assert.equal(3, query(container, '> *').length, 'query(container, "> *")');
			assert.equal(3, query(container, '> *, > h3').length, 'query(container, "> *"');
			assert.equal(3, query(t, '> h3').length, 'query(t, "> h3")');
		});
		test.test('compound queries', function () {
			assert.equal(2, query('.foo, .bar').length, 'query(".foo, .bar")');
			assert.equal(2, query('.foo,.bar').length, 'query(".foo,.bar")');
			assert.equal(2, query('#baz,#foo,#t').length, 'query("#baz,#foo,#t")');
			assert.equal(2, query('#foo,#baz,#t').length, 'query("#foo,#baz,#t")');
		});
		test.test('multiple class attribute', function () {
			assert.equal(1, query('.foo.bar').length, 'query(".foo.bar")');
			assert.equal(2, query('.foo').length, 'query(".foo")');
			assert.equal(2, query('.baz').length, 'query(".bar")');
		});
		test.test('case sensitivity', function () {
			assert.equal(1, query('span.baz').length, 'query("span.baz")');
			assert.equal(1, query('sPaN.baz').length, 'query("sPaN.baz")');
			assert.equal(1, query('SPAN.baz').length, 'query("SPAN.baz")');
			assert.equal(1, query('.fooBar').length, 'query(".fooBar")');
		});
		test.test('attribute selectors', function () {
			assert.equal(3, query('[foo]').length, 'query("[foo]")');
			assert.equal(1, query('[foo$="thud"]').length, 'query(\'[foo$="thud"]\')');
			assert.equal(1, query('[foo$=thud]').length, 'query(\'[foo$=thud]\')');
			assert.equal(1, query('[foo$="thudish"]').length, 'query(\'[foo$="thudish"]\')');
			assert.equal(1, query('#t [foo$=thud]').length, 'query("#t [foo$=thud]")');
			assert.equal(1, query('#t [title$=thud]').length);
			assert.equal(0, query('#t span[title$=thud ]').length);
			assert.equal(1, query('[id$=\'55555\']').length);
			assert.equal(2, query('[foo~="bar"]').length);
			assert.equal(2, query('[ foo ~= "bar" ]').length);
			assert.equal(2, query('[foo|="bar"]').length);
			assert.equal(1, query('[foo|="bar-baz"]').length);
			assert.equal(0, query('[foo|="baz"]').length);
		});
		test.test('descendent selectors', function () {
			var container = get('container');
			assert.equal(3, query(container, '> *').length, 'query(container, "> *")');
			assert.equal(2, query(container, '> [qux]').length, 'query(container, "> [qux]")');
			assert.equal('child1', query(container, '> [qux]')[0].id, 'query(container, "> [qux]")[0]');
			assert.equal('child3', query(container, '> [qux]')[1].id, 'query(container, "> [qux]")[1]');
			assert.equal(3, query(container, '> *').length, 'query(container, "> *")');
			assert.equal(3, query(container, '>*').length, 'query(container, ">*")');
			assert.equal('passed', query('#bug')[0].value, 'query("#bug")[0].value');
		});
		test.test('complex node structures', function () {
			// These were regression tests for Dojo ticket #9071
			var t4 = get('t4');
			assert.equal(2, query(t4, 'a').length);
			assert.equal(2, query(t4, 'p a').length);
			assert.equal(2, query(t4, 'div p').length);
			assert.equal(2, query(t4, 'div p a').length);
			assert.equal(2, query(t4, '.subA').length);
			assert.equal(2, query(t4, '.subP .subA').length);
			assert.equal(2, query(t4, '.subDiv .subP').length);
			assert.equal(2, query(t4, '.subDiv .subP .subA').length);
		});
		test.test('failed scope arg', function () {
			var thinger = get('thinger');
			assert.equal(0, query(thinger, '*').length, 'query(thinger, "*")');
			assert.equal(0, query('div#foo').length, 'query("div#foo")');
		});
		test.test('selector engine regressions', function () {
			// These were additional regression tests for Dojo 1.X
			var attrSpecialChars = get('attrSpecialChars');
			assert.equal(1, query(attrSpecialChars, 'option[value="a+b"]').length);
			assert.equal(1, query(attrSpecialChars, 'option[value="a~b"]').length);
			assert.equal(1, query(attrSpecialChars, 'option[value="a^b"]').length);
			assert.equal(1, query(attrSpecialChars, 'option[value="a,b"]').length);
			assert.equal(1, query(attrSpecialChars, 'a[href*=\'foo=bar\']', 'attrSpecialChars').length);
			assert.equal(1, query(attrSpecialChars, 'input[name="data[foo][bar]"]').length);
			assert.equal(1, query(attrSpecialChars, 'input[name="foo[0].bar"]').length);
			assert.equal(1, query(attrSpecialChars, 'input[name="test[0]"]').length);
			// escaping special characters with backslashes (http://www.w3.org/TR/CSS21/syndata.html#characters)
			// selector with substring that contains brackets (bug 9193, 11189, 13084)
			assert.equal(1, query(attrSpecialChars, 'input[name=data\\[foo\\]\\[bar\\]]').length);
			assert.equal(1, query(attrSpecialChars, 'input[name=foo\\[0\\]\\.bar]').length);
		});
		test.test('silly IDs', function () {
			assert(get('silly:id::with:colons'), 'get("silly:id::with:colons")');
			assert.equal(1, query('#silly\\:id\\:\\:with\\:colons').length, 'query("#silly\\:id\\:\\:with\\:colons")');
			assert.equal(1, query('#silly\\~id').length, 'query("#silly\\~id")');
		});
		// TODO XML tests
		test.test('css 2.1', function () {
			// first-child
			assert.equal(1, query('h1:first-child').length);
			assert.equal(2, query('h3:first-child').length);

			// + sibling selector
			assert.equal(1, query('.foo+ span').length);
			assert.equal(1, query('.foo+span').length);
			assert.equal(1, query('.foo +span').length);
			assert.equal(1, query('.foo + span').length);
		});
		test.test('css 3', function () {
			// sub-selector parsing
			assert.equal(1, query('#t span.foo:not(:first-child)').length);

			// ~ sibling selector
			assert.equal(4, query('.foo~ span').length);
			assert.equal(4, query('.foo~span').length);
			assert.equal(4, query('.foo ~span').length);
			assert.equal(4, query('.foo ~ span').length);
			assert.equal(1, query('#foo~ *').length);
			assert.equal(1, query('#foo ~*').length);
			assert.equal(1, query('#foo ~*').length);
			assert.equal(1, query('#foo ~ *').length);

			// nth-child tests
			assert.equal(2, query('#t > h3:nth-child(odd)').length);
			assert.equal(3, query('#t h3:nth-child(odd)').length);
			assert.equal(3, query('#t h3:nth-child(2n+1)').length);
			assert.equal(1, query('#t h3:nth-child(even)').length);
			assert.equal(1, query('#t h3:nth-child(2n)').length);
			assert.equal(1, query('#t h3:nth-child(2n+3)').length);
			assert.equal(2, query('#t h3:nth-child(1)').length);
			assert.equal(1, query('#t > h3:nth-child(1)').length);
			assert.equal(3, query('#t :nth-child(3)').length);
			assert.equal(0, query('#t > div:nth-child(1)').length);
			assert.equal(7, query('#t span').length);
			assert.equal(3, query('#t > *:nth-child(n+10)').length);
			assert.equal(1, query('#t > *:nth-child(n+12)').length);
			assert.equal(10, query('#t > *:nth-child(-n+10)').length);
			assert.equal(5, query('#t > *:nth-child(-2n+10)').length);
			assert.equal(6, query('#t > *:nth-child(2n+2)').length);
			assert.equal(5, query('#t > *:nth-child(2n+4)').length);
			assert.equal(5, query('#t > *:nth-child(2n+4)').length);
			assert.equal(5, query('#t> *:nth-child(2n+4)').length);
			assert.equal(12, query('#t > *:nth-child(n-5)').length);
			assert.equal(12, query('#t >*:nth-child(n-5)').length);
			assert.equal(6, query('#t > *:nth-child(2n-5)').length);
			assert.equal(6, query('#t>*:nth-child(2n-5)').length);
			assert.strictEqual(get('_foo'), query('.foo:nth-child(2)')[0]);
			// currently don't have the same head structure as the original Dojo 1.x tests...
			// assert.strictEqual(query('style')[0], query(':nth-child(2)')[0]);

			// :checked pseudo-selector
			assert.equal(2, query('#t2 > :checked').length);
			assert.strictEqual(get('checkbox2'), query('#t2 > input[type=checkbox]:checked')[0]);
			assert.strictEqual(get('radio2'), query('#t2 > input[type=radio]:checked')[0]);
			// This :checked selector is only defined for elements that have the checked property, option elements are
			// not specified by the spec (http://www.w3.org/TR/css3-selectors/#checked) and not universally supported 
			//assert.equal(2, query('#t2select option:checked').length);

			assert.equal(1, query('#radio1:disabled').length);
			assert.equal(0, query('#radio1:enabled').length);
			assert.equal(0, query('#radio2:disabled').length);
			assert.equal(1, query('#radio2:enabled').length);

			// :empty pseudo-selector
			assert.equal(4, query('#t > span:empty').length);
			assert.equal(6, query('#t span:empty').length);
			assert.equal(0, query('h3 span:empty').length);
			assert.equal(1, query('h3 :not(:empty)').length);
		});
		test.suite('.decorate()', function () {
			var div, p, button, nodes, spanNodes;
			test.test('basic', function () {
				div = doc.body.appendChild(doc.createElement('div'));
				p = doc.body.appendChild(doc.createElement('p'));
				button = doc.body.appendChild(doc.createElement('button'));
				nodes = query.decorate([ div, p, button ]);
				assert(nodes.on);
				assert(nodes.add);
				assert(nodes.remove);
				assert(nodes.modify);
				assert(nodes.concat);
				assert(nodes.every);
				assert(nodes.filter);
				assert(nodes.forEach);
				assert(nodes.indexOf);
				assert(nodes.join);
				assert(nodes.lastIndexOf);
				assert(nodes.map);
				assert(nodes.pop);
				assert(nodes.push);
				assert(nodes.reduce);
				assert(nodes.reduceRight);
				assert(nodes.reverse);
				assert(nodes.shift);
				assert(nodes.slice);
				assert(nodes.some);
				assert(nodes.sort);
				assert(nodes.splice);
				assert(nodes.unshift);
				assert.equal(nodes.length, 3);
			});
			test.test('[].add()', function () {
				spanNodes = nodes.add('span');
				assert.equal('span', div.firstChild.tagName.toLowerCase());
				assert.equal('span', p.firstChild.tagName.toLowerCase());
				assert.equal(spanNodes.length, 3);
				assert.strictEqual(spanNodes[0], div.firstChild);
				var bNodes = spanNodes.add('b[content=foo]');
				assert.equal(bNodes.length, 3);
			});
			test.test('[].query()', function () {
				var queryNodes = nodes.query('span');
				assert.equal(queryNodes.length, 3);
				assert.deepEqual(queryNodes, spanNodes);
			});
			test.test('[].on()', function () {
				var wasClicked = false,
					signal = nodes.on('click', function () {
						wasClicked = true;
					});

				assert.isFalse(wasClicked);
				on.emit(button, 'click', { bubbles: true, cancelable: true });
				assert.isTrue(wasClicked);
				wasClicked = false;
				signal.remove();
				on.emit(button, 'click', { bubbles: true, cancelable: true });
				assert.isFalse(wasClicked);
			});
			test.test('[].remove()', function () {
				assert(div.firstChild);
				assert(p.firstChild);
				assert(button.firstChild);
				spanNodes.remove();
				assert.isNull(div.firstChild);
				assert.isNull(p.firstChild);
				assert.isNull(button.firstChild);
			});
		});
	});
});