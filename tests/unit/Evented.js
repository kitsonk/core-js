define([
	'intern!tdd',
	'intern/chai!assert',
	'../../Evented',
	'../../on'
], function (test, assert, Evented, on) {
	test.suite('core/Evented', function () {
		test.test('existance', function () {
			var evented = new Evented();
			assert(evented.on);
			assert(evented.emit);
		});
		test.test('custom events', function () {
			var order = [];
			var NewEvented = Evented.extend({
				onclick: function (evt) {
					order.push(evt.a);
				}
			});

			var newEvented = new NewEvented();
			var signal = newEvented.on('click', function () {
				order.push(1);
			});

			newEvented.emit('click', { a: 2 });

			signal.remove();

			newEvented.emit('click', { a: 3 });

			assert.deepEqual(order, [ 2, 1, 3 ]);
		});
		test.test('core/on integration', function () {
			var order = [];
			var NewEvented = Evented.extend({
				onclick: function (evt) {
					order.push(evt.a);
				}
			});

			var newEvented = new NewEvented();

			var signal = on(newEvented, 'click', function () {
				order.push(1);
			});

			on.emit(newEvented, 'click', { a: 2 });

			signal.remove();

			on.emit(newEvented, 'click', { a: 3 });

			assert.deepEqual(order, [ 2, 1, 3 ]);
		});
	});
});