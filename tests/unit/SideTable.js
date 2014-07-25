define([
	'intern!tdd',
	'intern/chai!assert',
	'../../SideTable',
	'../../has'
], function (test, assert, SideTable, has) {
	test.suite('core/SideTable', function () {
		var st, fn, obj, value;
		test.test('feature detection', function () {
			if ('undefined' !== typeof WeakMap) {
				assert.isTrue(has('es6-weak-map'));
			}
			else {
				assert.isFalse(has('es6-weak-map'));
			}
		});
		if (!has('es6-weak-map')) {
			test.test('instantiation', function () {
				st = new SideTable();
				assert('get' in st);
				assert('set' in st);
				assert('delete' in st);
				assert('name' in st);
				assert('has' in st);
				var st2 = new SideTable();
				assert(st.name !== st2.name);
			});
			test.test('setting/getting', function () {
				obj = {};
				fn = function () {};
				value = {};

				assert(typeof st.get(obj) === 'undefined');
				st.set(obj, value);
				assert(st.get(obj) === value);
				st.get(obj).foo = 'bar';
				assert(value.foo === 'bar');

				assert(typeof st.get(fn) === 'undefined');
				st.set(fn, value);
				assert(st.get(fn) === value);
				st.get(fn).foo = 'baz';
				assert(value.foo === 'baz');
			});
			test.test('name', function () {
				assert.isTrue(st.has(fn));
				var fn2 = function () {};
				assert.isFalse(st.has(fn2));
			});
			test.test('delete', function () {
				assert(st.get(obj));
				assert(st.get(fn));
				st.delete(obj);
				st.delete(fn);
				assert(typeof st.get(obj) === 'undefined');
				assert(typeof st.get(fn) === 'undefined');
			});
		}
		else {
			test.test('WeakMap', function () {
				assert(SideTable === WeakMap);
				st = new SideTable();
				assert(st instanceof WeakMap);
			});
		}
	});
});