define([
	'intern!bench',
	'intern/chai!assert',
	'../../observe'
], function (bench, assert, observe) {
	/* global ObjectObserver */
	/* global PathObserver */
	/* global Platform */

	bench.benchmark('Object Observation', function () {
		var obj, handle, dfd;
		bench.test('ObjectObserver', {
			'defer': true,
			'onStart': function () {
				obj = {
					foo: 1
				};
				for (var i = 0; i <= 3000; i++) {
					obj['prop' + i] = Math.random();
				}

				handle = new ObjectObserver(obj, function () {
					dfd.resolve();
				});
			},
			'fn': function (cycleDfd) {
				dfd = cycleDfd;

				obj.foo = Math.random();

				Platform.performMicrotaskCheckpoint();
			},
			'onComplete': function () {
				handle.close();
			}
		});
		bench.test('observe.summary', {
			'defer': true,
			'onStart': function () {
				obj = {
					foo: 1
				};
				for (var i = 0; i <= 3000; i++) {
					obj['prop' + i] = Math.random();
				}

				handle = observe.summary(obj, function () {
					dfd.resolve();
				});
			},
			'fn': function (cycleDfd) {
				dfd = cycleDfd;

				obj.foo = Math.random();
			},
			'onComplete': function () {
				handle.remove();
			}
		});
	});

});