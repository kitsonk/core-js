define([
	'intern!tdd',
	'intern/chai!assert',
	'../../Deferred',
	'../../Promise',
	'../../errors/CancelError'
], function (test, assert, Deferred, Promise, CancelError) {

	test.suite('core/Deferred', function () {
		var deferred, canceller;

		test.beforeEach(function () {
			canceller = function () {};
			deferred = new Deferred(function (reason) {
				return canceller(reason);
			});
		});

		test.test('deferred receives result after resolving', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.then(dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			deferred.resolve(obj);
		});

		test.test('promise receives result after resolving', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.promise.then(dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			deferred.resolve(obj);
		});

		test.test('resolve() returns promise', function () {
			var obj = {};
			var returnedPromise = deferred.resolve(obj);
			assert(returnedPromise instanceof Promise);
			assert.strictEqual(returnedPromise, deferred.promise);
		});

		test.test('isResolved() returns true after resolving', function () {
			var dfd = this.async(100);
			assert.isFalse(deferred.isResolved());
			deferred.resolve();
			setTimeout(dfd.callback(function () {
				assert.isTrue(deferred.isResolved());
			}), 50);
		});
		test.test('isFulfilled() returns true after resolving', function () {
			var dfd = this.async(100);
			assert.isFalse(deferred.isFulfilled());
			deferred.resolve();
			setTimeout(dfd.callback(function () {
				assert.isTrue(deferred.isFulfilled());
			}));
		});

		test.test('resolve() is ignored after having been fulfilled', function () {
			var dfd = this.async(100);
			deferred.resolve();
			setTimeout(dfd.callback(function () {
				deferred.resolve();
			}), 50);
		});

		test.test('resolve() throws error after having been fulfilled and strict', function () {
			var dfd = this.async(100);
			deferred.resolve();
			setTimeout(dfd.callback(function () {
				assert.throws(function () {
					deferred.resolve({}, true);
				}, Error);
			}), 10);
		});

		test.test('resolve() results are cached', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.resolve(obj);
			deferred.then(dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
		});

		test.test('resolve() is already bound to the deferred', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.then(dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			var resolve = deferred.resolve;
			resolve(obj);
		});

		test.test('deferred receives result after rejecting', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			deferred.reject(obj);
		});

		test.test('promise receives result after rejecting', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.promise.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			deferred.reject(obj);
		});

		test.test('reject() returns promise', function () {
			var obj = {};
			var returnedPromise = deferred.reject(obj);
			assert(returnedPromise instanceof Promise);
			assert.strictEqual(returnedPromise, deferred.promise);
		});

		test.test('isRejected() returns true after rejecting', function () {
			var dfd = this.async(100);
			assert.isFalse(deferred.isRejected());
			deferred.reject();
			setTimeout(dfd.callback(function () {
				assert.isTrue(deferred.isRejected());
			}), 50);
		});

		test.test('isFulfilled() returns true after rejecting', function () {
			var dfd = this.async(100);
			assert.isFalse(deferred.isFulfilled());
			deferred.reject();
			setTimeout(dfd.callback(function () {
				assert.isTrue(deferred.isFulfilled());
			}));
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
			var dfd = this.async(100);
			var obj = {};
			deferred.reject(obj);
			deferred.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
		});

		test.test('reject() is already bound to the deferred', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			var reject = deferred.reject;
			reject(obj);
		});

		test.test('deferred receives result after progress', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.then(null, null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			deferred.progress(obj);
		});

		/* This is the one test cannot be addressed with ES6 Promises */
		test.test('promise receives result after progress', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.promise.then(null, null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			deferred.progress(obj);
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
			deferred.progress();
		});

		test.test('progress() throws error after having been fulfilled and strict', function () {
			deferred.resolve();
			assert.throws(function () {
				deferred.progress({}, true);
			});
		});

		test.test('progress() results are not cached', function () {
			var dfd = this.async(100);
			var obj1 = {}, obj2 = {};
			var received = [];
			deferred.progress(obj1);
			deferred.then(dfd.callback(function () {
				assert.strictEqual(received[0], obj2);
				assert.strictEqual(1, received.length);
			}), null, function (result) {
				received.push(result);
				deferred.resolve();
			});
			deferred.progress(obj2);
		});

		// test.test('progress() with chaining', function () {
		// 	var dfd = this.async(100);
		// 	var obj = {};
		// 	var inner = new Deferred();
		// 	deferred.then(function () { return inner; }).then(null, null, dfd.callback(function (result) {
		// 		assert.strictEqual(result, obj);
		// 	}));
		// 	deferred.resolve();
		// 	inner.progress(obj);
		// });

		test.test('after progress(), the progback return value is emitted on the returned promise', function () {
			var dfd = this.async(100);
			var promise = deferred.then(null, null, function (n) { return n * n; });
			promise.then(null, null, dfd.callback(function (n) {
				assert.strictEqual(4, n);
			}));
			deferred.progress(2);
		});

		test.test('progress() is already bound to the deferred', function () {
			var dfd = this.async(100);
			var obj = {};
			deferred.then(null, null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			var progress = deferred.progress;
			progress(obj);
		});

		test.test('cancel() invokes a canceller', function () {
			var invoked;
			canceller = function () { invoked = true; };
			deferred.cancel();
			assert.isTrue(invoked);
		});

		test.test('isCanceled() returns true after cancelling', function () {
			assert.isFalse(deferred.isCanceled());
			deferred.cancel();
			assert.isTrue(deferred.isCanceled());
		});

		test.test('isResolved() returns false after cancelling', function () {
			assert.isFalse(deferred.isResolved());
			deferred.cancel();
			assert.isFalse(deferred.isResolved());
		});

		test.test('isRejected() returns true after cancelling', function () {
			var dfd = this.async(100);
			assert.isFalse(deferred.isRejected());
			deferred.cancel();
			setTimeout(dfd.callback(function () {
				assert.isTrue(deferred.isRejected());
			}), 10);
		});

		test.test('isFulfilled() returns true after cancelling', function () {
			var dfd = this.async(100);
			assert.isFalse(deferred.isFulfilled());
			deferred.cancel();
			setTimeout(dfd.callback(function () {
				assert.isTrue(deferred.isFulfilled());
			}), 50);
		});

		test.test('cancel() is ignored after having been fulfilled', function () {
			var canceled = false;
			canceller = function () { canceled = true; };
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
			var dfd = this.async(100);
			var reason = deferred.cancel();
			deferred.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, reason);
			}));
		});

		test.test('cancel() returns default reason', function () {
			var reason = deferred.cancel();
			assert(reason instanceof CancelError);
		});

		test.test('reason is passed to canceller', function () {
			var obj = {};
			var received;
			canceller = function (reason) { received = reason; };
			deferred.cancel(obj);
			assert.strictEqual(received, obj);
		});

		test.test('cancels with reason returned from canceller', function () {
			var dfd = this.async(100);
			var obj = {};
			canceller = function () { return obj; };
			deferred.cancel();
			deferred.then(null, dfd.callback(function (reason) {
				assert.strictEqual(reason, obj);
			}));
		});

		test.test('cancel() returns reason from canceller', function () {
			var obj = {};
			canceller = function () { return obj; };
			var reason = deferred.cancel();
			assert.strictEqual(reason, obj);
		});

		test.test('cancel() returns reason from canceller, if canceller rejects with reason', function () {
			var obj = {};
			canceller = function () {
				deferred.reject(obj);
				return obj;
			};
			var reason = deferred.cancel();
			assert.strictEqual(reason, obj);
		});

		test.test('with canceller not returning anything, returns default CancelError', function () {
			var dfd = this.async(100);
			canceller = function () {};
			var reason = deferred.cancel();
			deferred.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, reason);
			}));
		});

		test.test('with canceller not returning anything, still returns passed reason', function () {
			var dfd = this.async(100);
			var obj = {};
			canceller = function () {};
			var reason = deferred.cancel(obj);
			assert.strictEqual(reason, obj);
			deferred.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, reason);
			}));
		});

		test.test('cancel() doesn\'t reject promise if canceller resolves deferred', function () {
			var dfd = this.async(100);
			var obj = {};
			canceller = function () { deferred.resolve(obj); };
			deferred.cancel();
			deferred.then(dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
		});

		/* ES6 Promises don't support cancelling */
		// test.test('cancel() doesn\'t reject promise if canceller resolves a chain of promises', function () {
		// 	var dfd = this.async(100);
		// 	var obj = {};
		// 	canceller = function () { deferred.resolve(obj); };
		// 	var last = deferred.then().then().then();
		// 	last.cancel();
		// 	last.then(dfd.callback(function (result) {
		// 		assert.strictEqual(result, obj);
		// 		assert.isTrue(deferred.isCanceled());
		// 		// assert.isTrue(last.isCanceled());
		// 	}));
		// });

		/* Because promises resolve asyncronously, the return of a canceller that resolves a promise is CancelError */
		// test.test('cancel() returns undefined if canceller resolves deferred', function () {
		// 	var obj = {};
		// 	canceller = function () { deferred.resolve(obj); };
		// 	var result = deferred.cancel();
		// 	assert.strictEqual(typeof result, 'undefined');
		// });

		test.test('cancel() doesn\'t change rejection value if canceller rejects deferred', function () {
			var dfd = this.async(100);
			var obj = {};
			canceller = function () { deferred.reject(obj); };
			deferred.cancel();
			deferred.then(null, dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
		});

		/* ES6 Promises don't support cancelling */
		// test.test('cancel() doesn\'t change rejection value if canceller rejects a chain of promises', function () {
		// 	var obj = {};
		// 	var received;
		// 	canceller = function () { deferred.reject(obj); };
		// 	var last = deferred.then().then().then();
		// 	last.cancel();
		// 	last.then(null, function (result) { received = result; });
		// 	assert.strictEqual(received, obj);
		// 	assert.isTrue(deferred.isCanceled());
		// 	assert.isTrue(last.isCanceled());
		// });

		/* Because promises reject asyncronously, the return of a canceller that rejects a promise is CancelError */
		// test.test('cancel() returns undefined if canceller rejects deferred', function () {
		// 	var obj = {};
		// 	canceller = function () { deferred.reject(obj); };
		// 	var result = deferred.cancel();
		// 	assert.strictEqual(typeof result, 'undefined');
		// });

		/* ES6 Promises don't support cancelling */
		// test.test('cancel() a promise chain', function () {
		// 	var obj = {};
		// 	var received;
		// 	canceller = function (reason) { received = reason; };
		// 	deferred.then().then().then().cancel(obj);
		// 	assert.strictEqual(received, obj);
		// });

		// test.test('cancel() a returned promise', function () {
		// 	var obj = {};
		// 	var received;
		// 	var inner = new Deferred(function (reason) { received = reason; });
		// 	var chain = deferred.then(function () {
		// 		return inner;
		// 	});
		// 	deferred.resolve();
		// 	chain.cancel(obj, true);
		// 	assert.strictEqual(received, obj);
		// });

		test.test('cancel() is already bound to the deferred', function () {
			var dfd = this.async(100);
			deferred.then(null, dfd.callback(function (result) {
				assert.instanceOf(result, CancelError);
			}));
			var cancel = deferred.cancel;
			cancel();
		});

		test.test('chained then()', function () {
			var dfd = this.async(100);
			function square(n) { return n * n; }

			deferred.then(square).then(square).then(dfd.callback(function (n) {
				assert.strictEqual(n, 16);
			}));
			deferred.resolve(2);
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
			var dfd = this.async(100);
			var obj = {};
			var then = deferred.then;
			then(dfd.callback(function (result) {
				assert.strictEqual(result, obj);
			}));
			deferred.resolve(obj);
		});

		/* ES6 Promises does not support isFulfilled */
		// test.test('then() with progback: returned promise is not fulfilled when progress is emitted', function () {
		// 	var progressed = false;
		// 	var promise = deferred.then(null, null, function () { progressed = true; });
		// 	deferred.progress();
		// 	assert.isTrue(progressed, 'Progress was received.');
		// 	assert.isFalse(promise.isFulfilled(), 'Promise is not fulfilled.');
		// });
	});
});