define([
	'intern!bench',
	'intern/chai!assert',
	'../../observe'
], function (bench, assert, observe) {
	/* global ObjectObserver */
	/* global PathObserver */
	/* global Platform */

	bench.benchmark('single property', function () {
		var obj, handle, count;
		bench.test('ChangeSummary', {
			'defer': true,
			'fn': function (dfd) {
				obj = {
					foo: 'bar'
				};

				handle = new ObjectObserver(obj, function () {
					if (count >= 5000) {
						handle.close();
						dfd.resolve();
					}
				});

				for (count = 0; count <= 5000; count++) {
					obj.foo = Math.random();
					Platform.performMicrotaskCheckpoint();
				}
			}
		});
		bench.test('observe', {
			'defer': true,
			'fn': function (dfd) {
				obj = {
					foo: 'bar'
				};

				handle = observe(obj, function () {
					if (count >= 5000) {
						handle.remove();
						dfd.resolve();
					}
				});

				for (count = 0; count <= 5000; count++) {
					obj.foo = Math.random();
				}
			}
		});
	});

	bench.benchmark('lots of properties', function () {
		var obj, handle, count;
		bench.test('ChangeSummary', {
			'defer': true,
			'fn': function (dfd) {
				obj = {
					foo: 'bar'
				};
				for (var i = 0; i <= 100; i++) {
					obj['foo' + i] = 'bar';
				}

				handle = new PathObserver(obj, 'foo', function () {
					if (count >= 5000) {
						handle.close();
						dfd.resolve();
					}
				});

				for (count = 0; count <= 5000; count++) {
					obj.foo = Math.random();
				}
			}
		});
		bench.test('observe', {
			'defer': true,
			'fn': function (dfd) {
				obj = {
					foo: 'bar'
				};
				for (var i = 0; i <= 100; i++) {
					obj['foo' + i] = 'bar';
				}

				handle = observe(obj, function () {
					if (count >= 5000) {
						handle.remove();
						dfd.resolve();
					}
				}, false, 'foo');

				for (count = 0; count <= 5000; count++) {
					obj.foo = Math.random();
				}
			}
		});
	});

});