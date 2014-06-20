define([
	'intern!tdd',
	'intern/chai!assert',
	'../lang',
	'../global'
], function (test, assert, lang, global) {
	'use strict';

	test.suite('core/lang', function () {
		test.test('lang.mixin()', function () {
			assert.typeOf(lang.mixin(), 'object');
			assert.typeOf(lang.mixin(undefined), 'object');
			assert.typeOf(lang.mixin(null), 'object');

			var src = {
				foo: function () {
					console.log('test');
				},
				bar: 'bar'
			};
			var dest = {};

			lang.mixin(dest, src);
			assert.typeOf(dest.foo, 'function');
			assert.typeOf(dest.bar, 'string');
		});
		test.test('lang.delegate()', function () {
			var a = {
				x: 1,
				y: function () { return 2; },
				z1: 99
			};
			var b = {
				x: 11,
				y: function () { return 12; },
				z2: 33,
				toString: function () { return 'bark!'; },
				toLocaleString: function () { return 'le bark-s!'; }
			};

			var c = lang.delegate(a, b);
			assert.equal(a.x, 1);
			assert.equal(a.y(), 2);
			assert.equal(a.z1, 99);
			assert.equal(c.x, 11);
			assert.equal(c.y(), 12);
			assert.equal(c.toString(), 'bark!');
			assert.equal(c.toLocaleString(), 'le bark-s!');
			assert.equal(c.z1, 99);
			assert.equal(c.z2, 33);
		});
		test.test('lang.clone()', function () {
			var obj1 = {
				foo: 'bar',
				answer: 42,
				jan102007: new Date(2007, 0, 10),
				baz: {
					a: null,
					b: [1, 'b', 2.3, true, false],
					c: {
						d: undefined,
						e: 99,
						f: function () { console.log(42); return 42; },
						g: /\d+/gm
					}
				},
				toString: function () { return 'meow'; }
			};

			var obj2 = lang.clone(obj1);

			assert.notEqual(obj1, obj2);
			assert.deepEqual(obj1, obj2);
			assert.equal(obj1.toString(), obj2.toString());
		});
		test.suite('lang.bind()', function () {
			test.test('binding', function () {
				var context = {
					foo: 'bar'
				};
				function bound() {
					return [ this.foo, arguments.length ];
				}
				var fn = lang.bind(context, bound);
				assert.deepEqual(fn(), [ 'bar', 0 ]);
				var fn2 = lang.bind(context, bound, 1, 2);
				assert.deepEqual(fn2(), [ 'bar', 2 ]);
			});
			test.test('early binding', function () {
				var context = {
					foo: 'bar',
					bar: 'baz',
					method: function () {
						return this.foo;
					}
				};
				var fn = lang.bind(context, context.method);
				context.method = function () {
					return this.bar;
				};
				assert.equal(fn(), 'bar');
			});
			test.test('late binding', function () {
				var context = {
					foo: 'bar',
					bar: 'baz',
					method: function () {
						return this.foo;
					}
				};
				var fn = lang.bind(context, 'method');
				assert.equal(fn(), 'bar');
				context.method = function () {
					return this.bar;
				};
				assert.equal(fn(), 'baz');
			});
		});
		test.suite('lang.hitch()', function () {
			test.test('basic', function () {
				var scope = { foo: 'bar' },
					scope2 = { foo: 'baz' };
				function thinger() {
					return [this.foo, arguments.length];
				}

				var st1 = lang.hitch(scope, thinger);
				assert.deepEqual(st1(), [ 'bar', 0 ]);

				var st2 = lang.hitch(scope2, thinger);
				assert.deepEqual(st2(), [ 'baz', 0 ]);
				assert.equal(st2('blah')[1], 1);

				/* st2 should be "scope proof" */
				assert.equal(st2.call(scope)[0], 'baz');
			});
			test.test('with arguments', function () {
				var scope = { foo: 'bar' },
					scope2 = { foo: 'baz' };
				function thinger() {
					return [this.foo, arguments.length];
				}

				var st1 = lang.hitch(scope, thinger, 'foo', 'bar');
				assert.deepEqual(st1(), [ 'bar', 2 ]);

				var st2 = lang.hitch(scope2, thinger, 'foo', 'bar');
				assert.deepEqual(st2(), [ 'baz', 2 ]);
			});
			test.test('as partial', function () {
				var scope = { foo: 'bar' };
				function thinger(arg1, arg2) {
					return [ (this && 'foo' in this) ? this.foo : undefined, arg1, arg2 ];
				}

				var st1 = lang.hitch(null, thinger);
				assert.equal(st1.call(scope)[0], 'bar');
				assert.isUndefined(st1()[0]);

				var st2 = lang.hitch(null, thinger, 'foo', 'bar');
				assert.equal(st2()[2], 'bar');
			});
			test.test('string', function () {
				var scope = {
					foo: 'bar',
					method: function () {
						return this.foo;
					}
				};

				var st1 = lang.hitch(scope, 'method');
				assert.equal(st1(), 'bar');
				assert.throws(function () {
					lang.hitch(scope, 'method2');
				});
			});
		});
		test.test('lang.extend()', function () {
			var src = {
				foo: function () {
					console.log('test');
				},
				bar: 'bar'
			};
			function Dest() {}
			lang.extend(Dest, src);
			var test = new Dest();
			assert.typeOf(test.foo, 'function');
			assert.typeOf(test.bar, 'string');
		});
		test.test('lang.getObject()', function () {
			var obj = { foo: {} };
			assert.strictEqual(obj.foo, lang.getObject('foo', false, obj));
			assert.typeOf(lang.getObject('foo.bar', false, obj), 'undefined');
			assert.deepEqual(lang.getObject('foo.bar', true, obj), {});
			obj.foo.bar.baz = 'test';
			assert.equal(obj.foo.bar, lang.getObject('foo.bar', false, obj));

			assert.typeOf(lang.getObject('_getObjectTest.bar'), 'undefined');
			global._getObjectTest = {};
			assert.equal(global._getObjectTest, lang.getObject('_getObjectTest'));
			assert.deepEqual(lang.getObject('_getObjectTest.bar', true), {});

			assert.typeOf(lang.getObject('./TestWidget'), 'undefined');
		});
		test.test('lang.setObject()', function () {
			var obj = { foo: 0 };
			assert(lang.setObject('foo', { bar: 'test' }, obj));
			assert.deepEqual({ bar: 'test' }, lang.getObject('foo', false, obj));
		});
		test.test('lang.exists()', function () {
			var obj = { foo: 0 };
			assert.isTrue(lang.exists('foo', obj));
			assert.isFalse(lang.exists('foo.bar', obj), 'lang.exists("foo.bar", obj)');

			assert.isFalse(lang.exists('_existsTest'));
			global._existsTest = false;
			assert.isTrue(lang.exists('_existsTest'));
			assert.isFalse(lang.exists('_existsTest.bar'));
		});
	});
});