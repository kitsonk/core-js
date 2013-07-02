define([
	'intern!tdd',
	'intern/chai!assert',
	'../Deferred',
	'../errors/CancelError'
], function (test, assert, Deferred, CancelError) {
	/* global Promise */
	test.suite('core/Deferred', function () {
		var deferred, canceler;

		test.beforeEach(function () {
			canceler = function () {};
			deferred = new Deferred(function (reason) {
				return canceler(reason);
			});
		});

		test.test('deferred receives result after resolving', function () {
			var obj = {},
				received;
			deferred.then(function (result) {
				received = result;
			});
			deferred.resolve(obj);
			assert.strictEqual(received, obj);
		});

		test.test('promise receives result after resolving', function () {
			var obj = {},
				received;
			deferred.promise.then(function (result) {
				received = result;
			});
			deferred.resolve(obj);
			assert.strictEqual(received, obj);
		});

		test.test('resolve() returns promise', function () {
			var obj = {};
			var returnedPromise = deferred.resolve(obj);
			assert(returnedPromise instanceof Promise);
			assert.strictEqual(returnedPromise, deferred.promise);
		});

		test.test('isResolved() returns true after resolving', function () {
			assert.isFalse(deferred.isResolved());
			deferred.resolve();
			assert.isTrue(deferred.isResolved());
		});
		test.test('isFulfilled() returns true after resolving', function () {
			assert.isFalse(deferred.isFulfilled());
			deferred.resolve();
			assert.isTrue(deferred.isFulfilled());
		});

		test.test('resolve() is ignored after having been fulfilled', function () {
			deferred.resolve();
			deferred.resolve();
		});

		test.test('resolve() throws error after having been fulfilled and strict', function () {
			deferred.resolve();
			assert.throws(function () {
				deferred.resolve({}, true);
			}, Error);
		});

		test.test('resolve() results are cached', function () {
			var obj = {};
			var received;
			deferred.resolve(obj);
			deferred.then(function (result) { received = result; });
			assert.strictEqual(received, obj);
		});

		test.test('resolve() is already bound to the deferred', function () {
			var obj = {};
			var received;
			deferred.then(function (result) { received = result; });
			var resolve = deferred.resolve;
			resolve(obj);
			assert.strictEqual(received, obj);
		});

		test.test('deferred receives result after rejecting', function () {
			var obj = {};
			var received;
			deferred.then(null, function (result) { received = result; });
			deferred.reject(obj);
			assert.strictEqual(received, obj);
		});

		test.test('promise receives result after rejecting', function () {
			var obj = {};
			var received;
			deferred.promise.then(null, function (result) { received = result; });
			deferred.reject(obj);
			assert.strictEqual(received, obj);
		});

		test.test('reject() returns promise', function () {
			var obj = {};
			var returnedPromise = deferred.reject(obj);
			assert(returnedPromise instanceof Promise);
			assert.strictEqual(returnedPromise, deferred.promise);
		});

		test.test('isRejected() returns true after rejecting', function () {
			assert.isFalse(deferred.isRejected());
			deferred.reject();
			assert.isTrue(deferred.isRejected());
		});

		test.test('isFulfilled() returns true after rejecting', function () {
			assert.isFalse(deferred.isFulfilled());
			deferred.reject();
			assert.isTrue(deferred.isFulfilled());
		});

		test.test('reject() is ignored after having been fulfilled', function () {
			deferred.reject();
			deferred.reject();
		});

		test.test('reject() throws error after having been fulfilled and strict', function () {
			deferred.reject();
			assert.throws(function () {
				deferred.reject({}, true);
			}, Error);
		});

		test.test('reject() results are cached', function () {
			var obj = {};
			var received;
			deferred.reject(obj);
			deferred.then(null, function (result) { received = result; });
			assert.strictEqual(received, obj);
		});

		test.test('reject() is already bound to the deferred', function () {
			var obj = {};
			var received;
			deferred.then(null, function (result) { received = result; });
			var reject = deferred.reject;
			reject(obj);
			assert.strictEqual(received, obj);
		});

		test.test('deferred receives result after progress', function () {
			var obj = {};
			var received;
			deferred.then(null, null, function (result) { received = result; });
			deferred.progress(obj);
			assert.strictEqual(received, obj);
		});

		test.test('promise receives result after progres', function () {
			var obj = {};
			var received;
			deferred.promise.then(null, null, function (result) { received = result; });
			deferred.progress(obj);
			assert.strictEqual(received, obj);
		});

		test.test('progress() returns promise', function () {
			var obj = {};
			var returnedPromise = deferred.progress(obj);
			assert(returnedPromise instanceof Promise);
			assert.strictEqual(returnedPromise, deferred.promise);
		});

		test.test('isResolved() returns false after progress', function () {
			assert.isFalse(deferred.isResolved());
			deferred.progress();
			assert.isFalse(deferred.isResolved());
		});

		test.test('isRejected() returns false after progress', function () {
			assert.isFalse(deferred.isRejected());
			deferred.progress();
			assert.isFalse(deferred.isRejected());
		});

		test.test('isFulfilled() returns false after progress', function () {
			assert.isFalse(deferred.isFulfilled());
			deferred.progress();
			assert.isFalse(deferred.isFulfilled());
		});

		test.test('progress() is ignored after having been fulfilled', function () {
			deferred.resolve();
			deferred.resolve();
		});

		test.test('progress() throws error after having been fulfilled and strict', function () {
			deferred.resolve();
			assert.throws(function () {
				deferred.progress({}, true);
			});
		});

		test.test('progress() results are not cached', function () {
			var obj1 = {}, obj2 = {};
			var received = [];
			deferred.progress(obj1);
			deferred.then(null, null, function (result) { received.push(result); });
			deferred.progress(obj2);
			assert.strictEqual(received[0], obj2);
			assert.strictEqual(1, received.length);
		});

		test.test('progress() with chaining', function () {
			var obj = {};
			var inner = new Deferred();
			var received;
			deferred.then(function () { return inner; }).then(null, null, function (result) { received = result; });
			deferred.resolve();
			inner.progress(obj);
			assert.strictEqual(received, obj);
		});

		test.test('after progress(), the progback return value is emitted on the returned promise', function () {
			var received;
			var promise = deferred.then(null, null, function (n) { return n * n; });
			promise.then(null, null, function (n) { received = n; });
			deferred.progress(2);
			assert.strictEqual(4, received);
		});

		test.test('progress() is already bound to the deferred', function () {
			var obj = {};
			var received;
			deferred.then(null, null, function (result) { received = result; });
			var progress = deferred.progress;
			progress(obj);
			assert.strictEqual(received, obj);
		});

		test.test('cancel() invokes a canceler', function () {
			var invoked;
			canceler = function () { invoked = true; };
			deferred.cancel();
			assert.isTrue(invoked);
		});

		test.test('isCanceled() returns true after canceling', function () {
			assert.isFalse(deferred.isCanceled());
			deferred.cancel();
			assert.isTrue(deferred.isCanceled());
		});

		test.test('isResolved() returns false after canceling', function () {
			assert.isFalse(deferred.isResolved());
			deferred.cancel();
			assert.isFalse(deferred.isResolved());
		});

		test.test('isRejected() returns true after canceling', function () {
			assert.isFalse(deferred.isRejected());
			deferred.cancel();
			assert.isTrue(deferred.isRejected());
		});

		test.test('isFulfilled() returns true after canceling', function () {
			assert.isFalse(deferred.isFulfilled());
			deferred.cancel();
			assert.isTrue(deferred.isFulfilled());
		});

		test.test('cancel() is ignored after having been fulfilled', function () {
			var canceled = false;
			canceler = function () { canceled = true; };
			deferred.resolve();
			deferred.cancel();
			assert.isFalse(canceled);
		});

		test.test('cancel() throws error after having been fulfilled and strict', function () {
			deferred.resolve();
			assert.throws(function () {
				deferred.cancel(null, true);
			}, Error);
		});

		test.test('cancel() without reason results in CancelError', function () {
			var reason = deferred.cancel();
			var received;
			deferred.then(null, function (result) { received = result; });
			assert(received, reason);
		});

		test.test('cancel() returns default reason', function () {
			var reason = deferred.cancel();
			assert(reason instanceof CancelError);
		});

		test.test('reason is passed to canceler', function () {
			var obj = {};
			var received;
			canceler = function (reason) { received = reason; };
			deferred.cancel(obj);
			assert.strictEqual(received, obj);
		});

		test.test('cancels with reason returned from canceler', function () {
			var obj = {};
			var received;
			canceler = function () { return obj; };
			deferred.cancel();
			deferred.then(null, function (reason) { received = reason; });
			assert.strictEqual(received, obj);
		});

		test.test('cancel() returns reason from canceler', function () {
			var obj = {};
			canceler = function () { return obj; };
			var reason = deferred.cancel();
			assert.strictEqual(reason, obj);
		});

		test.test('cancel() returns reason from canceler, if canceler rejects with reason', function () {
			var obj = {};
			canceler = function () {
				deferred.reject(obj);
				return obj;
			};
			var reason = deferred.cancel();
			assert.strictEqual(reason, obj);
		});

		test.test('with canceler not returning anything, returns default CancelError', function () {
			canceler = function () {};
			var reason = deferred.cancel();
			var received;
			deferred.then(null, function (result) { received = result; });
			assert.strictEqual(received, reason);
		});

		test.test('with canceler not returning anything, still returns passed reason', function () {
			var obj = {};
			var received;
			canceler = function () {};
			var reason = deferred.cancel(obj);
			assert.strictEqual(reason, obj);
			deferred.then(null, function (result) { received = result; });
			assert.strictEqual(received, reason);
		});

		test.test('cancel() doesn\'t reject promise if canceler resolves deferred', function () {
			var obj = {};
			var received;
			canceler = function () { deferred.resolve(obj); };
			deferred.cancel();
			deferred.then(function (result) { received = result; });
			assert.strictEqual(received, obj);
		});

		test.test('cancel() doesn\'t reject promise if canceler resolves a chain of promises', function () {
			var obj = {};
			var received;
			canceler = function () { deferred.resolve(obj); };
			var last = deferred.then().then().then();
			last.cancel();
			last.then(function (result) { received = result; });
			assert.strictEqual(received, obj);
			assert.isTrue(deferred.isCanceled());
			assert.isTrue(last.isCanceled());
		});

		test.test('cancel() returns undefined if canceler resolves deferred', function () {
			var obj = {};
			canceler = function () { deferred.resolve(obj); };
			var result = deferred.cancel();
			assert.strictEqual(typeof result, 'undefined');
		});

		test.test('cancel() doesn\'t change rejection value if canceler rejects deferred', function () {
			var obj = {};
			var received;
			canceler = function () { deferred.reject(obj); };
			deferred.cancel();
			deferred.then(null, function (result) { received = result; });
			assert.strictEqual(received, obj);
		});

		test.test('cancel() doesn\'t change rejection value if canceler rejects a chain of promises', function () {
			var obj = {};
			var received;
			canceler = function () { deferred.reject(obj); };
			var last = deferred.then().then().then();
			last.cancel();
			last.then(null, function (result) { received = result; });
			assert.strictEqual(received, obj);
			assert.isTrue(deferred.isCanceled());
			assert.isTrue(last.isCanceled());
		});

		test.test('cancel() returns undefined if canceler rejects deferred', function () {
			var obj = {};
			canceler = function () { deferred.reject(obj); };
			var result = deferred.cancel();
			assert.strictEqual(typeof result, 'undefined');
		});

		test.test('cancel() a promise chain', function () {
			var obj = {};
			var received;
			canceler = function (reason) { received = reason; };
			deferred.then().then().then().cancel(obj);
			assert.strictEqual(received, obj);
		});

		test.test('cancel() a returned promise', function () {
			var obj = {};
			var received;
			var inner = new Deferred(function (reason) { received = reason; });
			var chain = deferred.then(function () {
				return inner;
			});
			deferred.resolve();
			chain.cancel(obj, true);
			assert.strictEqual(received, obj);
		});

		test.test('cancel() is already bound to the deferred', function () {
			var received;
			deferred.then(null, function (result) { received = result; });
			var cancel = deferred.cancel;
			cancel();
			assert(received instanceof CancelError);
		});

		test.test('chained then()', function () {
			function square(n) { return n * n; }

			var result;
			deferred.then(square).then(square).then(function (n) {
				result = n;
			});
			deferred.resolve(2);
			assert.strictEqual(result, 16);
		});

		test.test('asynchronously chained then()', function () {
			function asyncSquare(n) {
				var inner = new Deferred();
				setTimeout(function () { inner.resolve(n * n); }, 0);
				return inner.promise;
			}

			var dfd = this.async(250);
			deferred.then(asyncSquare).then(asyncSquare).then(dfd.callback(function (n) {
				assert.strictEqual(n, 16);
			}));
			deferred.resolve(2);
		});

		test.test('then() is already bound to the deferred', function () {
			var obj = {};
			var then = deferred.then;
			var received;
			then(function (result) { received = result; });
			deferred.resolve(obj);
			assert.strictEqual(received, obj);
		});

		test.test('then() with progback: returned promise is not fulfilled when progress is emitted', function () {
			var progressed = false;
			var promise = deferred.then(null, null, function () { progressed = true; });
			deferred.progress();
			assert.isTrue(progressed, 'Progress was received.');
			assert.isFalse(promise.isFulfilled(), 'Promise is not fulfilled.');
		});
	});
});