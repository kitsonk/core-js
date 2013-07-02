define([
	'intern!tdd',
	'intern/chai!assert',
	'../Deferred',
	'../when'
], function (test, assert, Deferred, when) {
	/* global Promise */
	test.suite('core/when', function () {
		var deferred;

		test.beforeEach(function () {
			deferred = new Deferred();
		});

		test.test('when() returns the same promise without callbacks', function () {
			var obj = {};
			var promise1 = when(obj);
			assert(promise1 instanceof Promise);
			var promise2 = when(deferred.promise);
			assert(promise2 instanceof Promise);
			assert.strictEqual(deferred.promise, promise2);
		});

		test.test('when() doesn\'t convert to promise if errback is passed but no callback', function () {
			var obj = {};
			var result = when(obj, null, function () {});
			assert.strictEqual(result, obj);
		});

		test.test('when() with a result value', function () {
			var obj = {};
			var received;
			when(obj, function (result) { received = result; });
			assert.strictEqual(received, obj);
		});

		test.test('when() with a result value, returns result of callback', function () {
			var obj1 = {}, obj2 = {};
			var received;
			var returned = when(obj1, function (result) {
				received = result;
				return obj2;
			});
			assert.strictEqual(received, obj1);
			assert.strictEqual(returned, obj2);
		});

		test.test('when() with a promise that gets resolved', function () {
			var obj = {};
			var received;
			when(deferred.promise, function (result) { received = result; });
			deferred.resolve(obj);
			assert.strictEqual(received, obj);
		});

		test.test('when() with a promise that gets rejected', function () {
			var obj = {};
			var received;
			when(deferred.promise, null, function (result) { received = result; });
			deferred.reject(obj);
			assert.strictEqual(received, obj);
		});

		test.test('when() with a promise that gets progress', function () {
			var obj = {};
			var received;
			when(deferred.promise, null, null, function (result) { received = result; });
			deferred.progress(obj);
			assert.strictEqual(received, obj);
		});

		test.test('when() with chaining of the result', function () {
			function square(n) { return n * n; }

			var received;
			when(2).then(square).then(square).then(function (n) { received = n; });
			assert.strictEqual(received, 16);
		});

		test.test('when() converts foreign promises', function () {
			var _callback;
			var foreign = { then: function (cb) { _callback = cb; } };
			var promise = when(foreign);

			var obj = {};
			var received;
			promise.then(function (result) { received = result; });
			_callback(obj);
			assert(promise instanceof Promise);
			assert.strictEqual(received, obj);
		});
	});
});