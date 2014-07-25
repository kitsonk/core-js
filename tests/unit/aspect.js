define([
	'intern!tdd',
	'intern/chai!assert',
	'../../aspect'
], function (test, assert, aspect) {
	test.suite('core/aspect', function () {
		test.test('aspect.before()', function () {
			var order = [],
				obj = {
					method: function (a) {
						order.push(a);
					}
				},
				signal = aspect.before(obj, 'method', function (a) {
					order.push(a);
					return [ a + 1 ];
				});

			obj.method(0);
			obj.method(2);

			var signal2 = aspect.before(obj, 'method', function (a) {
				order.push(a);
				return [ a + 1 ];
			});

			obj.method(4);
			signal.remove();
			obj.method(7);
			signal2.remove();
			obj.method(9);

			assert.deepEqual(order, [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
		});
		test.test('aspect.after()', function () {
			var order = [],
				obj = {
					method: function (a) {
						order.push(a);
						return a + 1;
					}
				},
				signal = aspect.after(obj, 'method', function (a) {
					order.push(0);
					return a + 1;
				});

			obj.method(0);

			var signal2 = aspect.after(obj, 'method', function (a) {
				order.push(a);
			});

			obj.method(3);

			var signal3 = aspect.after(obj, 'method', function () {
				order.push(3);
			}, true);

			obj.method(3);
			signal2.remove();
			obj.method(6);
			signal3.remove();

			var signal4 = aspect.after(obj, 'method', function () {
				order.push(4);
			}, true);

			signal.remove();
			obj.method(7);
			signal4.remove();

			aspect.after(obj, 'method', function (a) {
				order.push(a);
				aspect.after(obj, 'method', function (a) {
					order.push(a);
				});
				aspect.after(obj, 'method', function (a) {
					order.push(a);
				}).remove();
				return a + 1;
			});
			aspect.after(obj, 'method', function (a) {
				order.push(a);
				return a + 2;
			});

			obj.method(8);
			obj.method(8);

			assert.deepEqual(order, [ 0, 0, 3, 0, 5, 3, 0, 5, 3, 6, 0, 3, 7, 4, 8, 9, 10, 8, 9, 10, 12 ]);

			obj = { method: function () {} };
			aspect.after(obj, 'method', function () {
				return false;
			}, true);

			assert.isFalse(obj.method());
		});
		test.test('aspect.after() - multiple', function () {
			var order = [],
				obj = { method: function () {} };

			aspect.after(obj, 'method', function () { order.push(1); });
			aspect.after(obj, 'method', function () { order.push(2); });
			aspect.after(obj, 'method', function () { order.push(3); });

			obj.method();

			assert.deepEqual(order, [ 1, 2, 3 ]);
		});
		test.test('aspect.around()', function () {
			var order = [],
				obj = {
					method: function (a) {
						order.push(a);
						return a + 1;
					}
				};
			
			aspect.before(obj, 'method', function (a) {
				order.push(a);
			}),
			
			aspect.around(obj, 'method', function (original) {
				return function (a) {
					a = a + 1;
					a = original(a);
					order.push(a);
					return a + 1;
				};
			});

			order.push(obj.method(0));
			obj.method(4);

			assert.deepEqual(order, [ 0, 1, 2, 3, 4, 5, 6 ]);
		});
		test.test('aspect.around() - multiple', function () {
			var order = [],
				obj = {
					method: function () {
						order.push(1);
					}
				};

			aspect.around(obj, 'method', function (original) {
				return function () {
					original();
					order.push(2);
				};
			});

			var signal2 = aspect.around(obj, 'method', function (original) {
				return function () {
					original();
					order.push(3);
				};
			});

			aspect.around(obj, 'method', function (original) {
				return function () {
					original();
					order.push(4);
				};
			});

			signal2.remove();
			obj.method();

			assert.deepEqual(order, [ 1, 2, 4 ]);
		});
		test.test('signal.remove() multiple', function () {
			var order = [],
				obj = { method: function () {} };

			aspect.after(obj, 'method', function () {
				order.push(1);
			});

			var signal2 = aspect.after(obj, 'method', function () {
				order.push(2);
			});

			var signal3 = aspect.after(obj, 'method', function () {
				order.push(3);
			});

			obj.method();

			signal2.remove();
			signal3.remove();

			signal2.remove();

			obj.method();

			assert.deepEqual(order, [ 1, 2, 3, 1 ]);
		});
		test.test('delegation', function () {
			var order = [],
				proto = {
					foo: function (a) {
						order.push(a);
						return a;
					},
					bar: function () {}
				};

			aspect.after(proto, 'foo', function (a) {
				order.push(a + 1);
				return a;
			});
			aspect.after(proto, 'bar', function () {
				assert.isTrue(this.isInstance);
			});

			proto.foo(0);

			function Class() {}

			Class.prototype = proto;
			var instance = new Class();
			instance.isInstance = true;

			aspect.after(instance, 'foo', function (a) {
				order.push(a + 2);
				return a;
			});

			instance.bar();
			instance.foo(2);
			proto.foo(5);

			assert.deepEqual(order, [ 0, 1, 2, 3, 4, 5, 6 ]);
		});
	});
});