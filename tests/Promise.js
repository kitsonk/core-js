define([
	'intern!tdd',
	'intern/chai!assert',
	'../sniff',
	'../Promise'
], function (test, assert, has, Promise) {
	test.suite('core/Promise', function () {
		test.suite('Promise constructor', function () {
			test.test('should exist and have length 1', function () {
				assert(Promise);
				assert.equal(Promise.length, 1);
			});
			test.test('should fulfill if `resolve` is called with a value', function () {
				var dfd = this.async(250);

				var promise = new Promise(function (resolve) { resolve('value'); });

				promise.then(dfd.callback(function (value) {
					assert.equal(value, 'value');
				}));
			});
			test.test('should reject if `reject` is called with a reason', function () {
				var dfd = this.async(250);

				var promise = new Promise(function (resolve, reject) { reject('reason'); });

				promise.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
					assert.equal(reason, 'reason');
				}));
			});
			test.test('should be a constructor', function () {
				var promise = new Promise(function () {});

				assert.equal(Object.getPrototypeOf(promise), Promise.prototype, '[[Prototype]] equals Promise.prototype');
				assert.equal(promise.constructor, Promise, 'constructor property of instances is set correctly');
				assert.equal(Promise.prototype.constructor, Promise, 'constructor property of prototype is set correctly');
			});
			if (!has('ff')) {
				/* Firefox Promises don't throw without `new` */
				test.test('should not work without `new`', function () {
					assert.throws(function () {
						/* jslint newcap:true */
						Promise(function (resolve) { resolve('value'); });
					}, TypeError);
				});
			}
			test.test('should throw a `TypeError` if not given a function', function () {
				assert.throws(function () {
					new Promise();
				}, TypeError);

				assert.throws(function () {
					new Promise({});
				}, TypeError);

				assert.throws(function () {
					new Promise('foo');
				}, TypeError);
			});
			test.test('should reject on resolver exception', function () {
				var dfd = this.async(250);

				new Promise(function () {
					throw 'error';
				}).then(dfd.reject.bind(dfd), dfd.callback(function (e) {
					assert(e, 'error');
				}));
			});
			test.test('should not resolve multiple times', function () {
				var dfd = this.async(250);

				var resolver,
					rejector,
					fulfilled = 0,
					rejected = 0;

				var thenable = {
					then: function (resolve, reject) {
						resolver = resolve;
						rejector = reject;
					}
				};

				var promise = new Promise(function (resolve) {
					resolve(1);
				});

				promise.then(function () {
					return thenable;
				}).then(function () {
					fulfilled++;
				}, function () {
					rejected++;
				});

				setTimeout(function () {
					resolver(1);
					resolver(1);
					rejector(1);
					rejector(1);

					setTimeout(dfd.callback(function () {
						assert.equal(fulfilled, 1);
						assert.equal(rejected, 0);
					}), 20);
				}, 20);
			});
			test.suite('assimiliation', function () {
				test.test('should assimilate if `resolve` is called with a fulfilled promise', function () {
					var dfd = this.async(250);

					var originalPromise = new Promise(function (resolve) { resolve('original value'); }),
						promise = new Promise(function (resolve) { resolve(originalPromise); });

					promise.then(dfd.callback(function (value) {
						assert.equal(value, 'original value');
					}));
				});
				test.test('should assimilate if `resolve` is called with a rejected promise', function () {
					var dfd = this.async(250);

					var originalPromise = new Promise(function (resolve, reject) { reject('original reason'); }),
						promise = new Promise(function (resolve) { resolve(originalPromise); });

					promise.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
						assert.equal(reason, 'original reason');
					}));
				});
				test.test('should assimilate if `resolve` is called with a fulfilled thenable', function () {
					var dfd = this.async(250);

					var originalThenable = {
						then: function (onFulfilled) {
							setTimeout(function () { onFulfilled('original value'); }, 0);
						}
					};

					var promise = new Promise(function (resolve) { resolve(originalThenable); });

					promise.then(dfd.callback(function (value) {
						assert.equal(value, 'original value');
					}));
				});
				test.test('should assimilate if `resolve` is called with a rejected thenable', function () {
					var dfd = this.async(250);

					var originalThenable = {
						then: function (onFulfilled, onRejected) {
							setTimeout(function () { onRejected('original reason'); }, 0);
						}
					};

					var promise = new Promise(function (resolve) { resolve(originalThenable); });

					promise.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
						assert.equal(reason, 'original reason');
					}));
				});
				if (!has('es6-promises')) {
					/* Native Promises Currently Fail this test */
					test.test('should assimilate two levels deep, for fulfillment of self fulfilling promises', function () {
						var dfd = this.async(250);

						var originalPromise,
							promise;

						originalPromise = new Promise(function (resolve) {
							setTimeout(function () {
								resolve(originalPromise);
							}, 0);
						});

						promise = new Promise(function (resolve) {
							setTimeout(function () {
								resolve(originalPromise);
							}, 0);
						});

						promise.then(dfd.callback(function (value) {
							assert.equal(value, originalPromise);
						}));
					});
				}
				test.test('should assimilate two levels deep, for fulfillment', function () {
					var dfd = this.async(250);

					var originalPromise = new Promise(function (resolve) { resolve('original value'); }),
						nextPromise = new Promise(function (resolve) { resolve(originalPromise); }),
						promise = new Promise(function (resolve) { resolve(nextPromise); });

					promise.then(dfd.callback(function (value) {
						assert.equal(value, 'original value');
					}));
				});
				test.test('should assimilate two levels deep, for rejection', function () {
					var dfd = this.async(250);

					var originalPromise = new Promise(function (resolve, reject) { reject('original reason'); }),
						nextPromise = new Promise(function (resolve) { resolve(originalPromise); }),
						promise = new Promise(function (resolve) { resolve(nextPromise); });

					promise.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
						assert.equal(reason, 'original reason');
					}));
				});
				test.test('should assimilate three levels deep, mixing thenables and promises (fulfilled case)', function () {
					var dfd = this.async(250);

					var originalPromise = new Promise(function (resolve) { resolve('original value'); }),
						intermediateThenable = {
							then: function (onFulfilled) {
								setTimeout(function () { onFulfilled(originalPromise); }, 0);
							}
						},
						promise = new Promise(function (resolve) { resolve(intermediateThenable); });

					promise.then(dfd.callback(function (value) {
						assert.equal(value, 'original value');
					}));
				});
				test.test('should assimilate three levels deep, mixing thenables and promises (rejected case)', function () {
					var dfd = this.async(250);

					var originalPromise = new Promise(function (resolve, reject) { reject('original reason'); }),
						intermediateThenable = {
							then: function (onFulfilled) {
								setTimeout(function () { onFulfilled(originalPromise); }, 0);
							}
						},
						promise = new Promise(function (resolve) { resolve(intermediateThenable); });

					promise.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
						assert.equal(reason, 'original reason');
					}));
				});
			});
		});
		test.suite('Promise.all', function () {
			test.test('should exist', function () {
				assert(Promise.all);
			});
			if (!has('es6-promises')) {
				test.test('throws when not passed an array', function () {
					assert.throws(function () {
						var all = Promise.all();
					}, TypeError);

					assert.throws(function () {
						var all = Promise.all('');
					}, TypeError);

					assert.throws(function () {
						var all = Promise.all({});
					});
				});
			}
			test.test('fulfilled only after all of the other promises are fulfilled', function () {
				var dfd = this.async(250);

				var firstResolved, secondResolved, firstResolver, secondResolver;

				var first = new Promise(function (resolve) {
					firstResolver = resolve;
				});
				first.then(function () {
					firstResolved = true;
				});

				var second = new Promise(function (resolve) {
					secondResolver = resolve;
				});
				second.then(function () {
					secondResolved = true;
				});

				setTimeout(function () {
					firstResolver(true);
				}, 0);
				setTimeout(function () {
					secondResolver(true);
				}, 0);

				Promise.all([first, second]).then(dfd.callback(function () {
					assert(firstResolved);
					assert(secondResolved);
				}));
			});
			test.test('rejected as soon as a promise is rejected', function () {
				var dfd = this.async(250);

				var firstResolver, secondResolver;

				var first = new Promise(function (resolve, reject) {
					firstResolver = { resolve: resolve, reject: reject };
				});

				var second = new Promise(function (resolve, reject) {
					secondResolver = { resolve: resolve, reject: reject };
				});

				setTimeout(function () {
					firstResolver.reject({});
				}, 0);

				var firstWasRejected, secondCompleted;

				first['catch'](function () {
					firstWasRejected = true;
				});

				second.then(function () {
					secondCompleted = true;
				}, function (err) {
					secondCompleted = true;
					throw err;
				});

				Promise.all([first, second]).then(function () {
					assert(false);
				}, dfd.callback(function () {
					assert(firstWasRejected);
					assert(!secondCompleted);
				}));
			});
			test.test('passes the resolved values of each promise to the callback in the correct order', function () {
				var dfd = this.async(250);

				var firstResolver, secondResolver, thirdResolver;

				var first = new Promise(function (resolve, reject) {
					firstResolver = { resolve: resolve, reject: reject };
				});

				var second = new Promise(function (resolve, reject) {
					secondResolver = { resolve: resolve, reject: reject };
				});

				var third = new Promise(function (resolve, reject) {
					thirdResolver = { resolve: resolve, reject: reject };
				});

				thirdResolver.resolve(3);
				firstResolver.resolve(1);
				secondResolver.resolve(2);

				Promise.all([first, second, third]).then(dfd.callback(function (results) {
					assert.strictEqual(results.length, 3);
					assert.strictEqual(results[0], 1);
					assert.strictEqual(results[1], 2);
					assert.strictEqual(results[2], 3);
				}));
			});
			test.test('resolves an empty array passed to Promise.all()', function () {
				var dfd = this.async(250);

				Promise.all([]).then(dfd.callback(function (results) {
					assert.strictEqual(results.length, 0);
				}));
			});
			test.test('works with null', function () {
				var dfd = this.async(250);

				Promise.all([null]).then(dfd.callback(function (results) {
					assert.strictEqual(results[0], null);
				}));
			});
			test.test('works with a mix of promises and thenables and non-promises', function () {
				var dfd = this.async(250);

				var promise = new Promise(function (resolve) { resolve(1); }),
					syncThenable = { then: function (onFulfilled) { onFulfilled(2); } },
					asyncThenable = { then: function (onFulfilled) { setTimeout(function () { onFulfilled(3); }, 0); } },
					nonPromise = 4;

				Promise.all([ promise, syncThenable, asyncThenable, nonPromise ]).then(dfd.callback(function (results) {
					assert.deepEqual(results, [1, 2, 3, 4]);
				}));
			});
		});
		test.suite('Promise.reject', function () {
			test.test('it should exist', function () {
				assert(Promise.reject);
			});
			test.test('it rejects', function () {
				var dfd = this.async(250);

				var reason = 'the reason',
					promise = Promise.reject(reason);

				promise.then(dfd.reject.bind(dfd), dfd.callback(function (actualReason) {
					assert.equal(reason, actualReason);
				}));
			});
		});
		test.suite('Promise.race', function () {
			test.test('it should exist', function () {
				assert(Promise.race);
			});

			if (!has('es6-promises')) {
				test.test('throws when not passed an array', function () {
					assert.throws(function () {
						var race = Promise.race();
					}, TypeError);

					assert.throws(function () {
						var race = Promise.race('');
					}, TypeError);

					assert.throws(function () {
						var race = Promise.race({});
					}, TypeError);
				});
			}
			test.test('fulfilled after one of the other promises are fulfilled', function () {
				var dfd = this.async(250);

				var firstResolved, secondResolved, firstResolver, secondResolver;

				var first = new Promise(function (resolve) {
					firstResolver = resolve;
				});
				first.then(function () {
					firstResolved = true;
				});

				var second = new Promise(function (resolve) {
					secondResolver = resolve;
				});
				second.then(function () {
					secondResolved = true;
				});

				setTimeout(function () {
					firstResolver(true);
				}, 100);

				setTimeout(function () {
					secondResolver(true);
				}, 0);

				Promise.race([ first, second ]).then(dfd.callback(function () {
					assert(secondResolved);
					assert.isUndefined(firstResolved);
				}));
			});
			if (!has('es6-promises')) {
				/* ES6 Promises returns `true` and not 5 */
				test.test('if one of the promises is not thenable fulfills with it first', function () {
					var dfd = this.async(250);

					var nonPromise = 5;

					var first = new Promise(function (resolve) {
						resolve(true);
					});

					var second = new Promise(function (resolve) {
						resolve(false);
					});

					Promise.race([ first, second, nonPromise]).then(dfd.callback(function (value) {
						assert.equal(value, 5);
					}));
				});
			}
			test.test('rejected as soon as a promise is rejected', function () {
				var dfd = this.async(250);

				var firstResolver, secondResolver;

				var first = new Promise(function (resolve, reject) {
					firstResolver = { resolve: resolve, reject: reject };
				});

				var second = new Promise(function (resolve, reject) {
					secondResolver = { resolve: resolve, reject: reject };
				});

				setTimeout(function () {
					firstResolver.reject({});
				}, 0);

				var firstWasRejected, secondCompleted;

				first['catch'](function () {
					firstWasRejected = true;
				});

				second.then(function () {
					secondCompleted = true;
				}, dfd.reject.bind(dfd));

				Promise.race([ first, second ]).then(dfd.reject.bind(dfd), dfd.callback(function () {
					assert(firstWasRejected);
					assert(!secondCompleted);
				}));
			});
			test.test('resolves an empty array to forever pending Promise', function () {
				var dfd = this.async(250);

				var foreverPendingPromise = Promise.race([]),
					wasSettled;

				foreverPendingPromise.then(function () {
					wasSettled = true;
				}, function () {
					wasSettled = true;
				});

				setTimeout(dfd.callback(function () {
					assert(!wasSettled);
				}), 100);
			});
		});
		test.suite('Promise.resolve', function () {
			test.test('it should exist', function () {
				assert(Promise.resolve);
			});
			test.suite('if x is a promise, adopt its state', function () {
				test.test('if x is pending, promise must remain pending until x is fulfilled or rejected', function () {
					var dfd = this.async(250);

					var expectedValue, resolver, thenable, wrapped;

					expectedValue = 'the value';
					thenable = { then: function (resolve) { resolver = resolve; } };

					wrapped = Promise.resolve(thenable);

					wrapped.then(dfd.callback(function (value) {
						assert.strictEqual(value, expectedValue);
					}));

					resolver(expectedValue);
				});
				test.test('if/when x is fulfilled, fulfill promise with the same value', function () {
					var dfd = this.async(250);

					var expectedValue, thenable, wrapped;

					expectedValue = 'the value';
					thenable = { then: function (resolve) { resolve(expectedValue); } };

					wrapped = Promise.resolve(thenable);

					wrapped.then(dfd.callback(function (value) {
						assert.strictEqual(value, expectedValue);
					}));
				});
				test.test('if/when x is rejected, reject promise with the same reason', function () {
					var dfd = this.async(250);

					var expectedReason, thenable, wrapped;

					expectedReason = new Error();
					thenable = { then: function (resolve, reject) { reject(expectedReason); } };

					wrapped = Promise.resolve(thenable);

					wrapped.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
						assert.strictEqual(reason, expectedReason);
					}));
				});
			});
			test.suite('otherwise, if x is an object or function', function () {
				test.test('let then x.then', function () {
					var accessCount, wrapped, thenable;

					accessCount = 0;
					thenable = {};

					Object.defineProperty(thenable, 'then', {
						get: function () {
							accessCount++;

							if (accessCount > 1) {
								throw new Error();
							}

							return function () {};
						}
					});

					assert.strictEqual(accessCount, 0);

					wrapped = Promise.resolve(thenable);

					if (!has('es6-promises')) {
						assert.strictEqual(accessCount, 1);
					}
				});
				test.test('if retrieving the property x.then results in a thrown exception e, reject promise with e as the reason', function () {
					var dfd = this.async(250);

					var wrapped, thenable, expectedReason;

					expectedReason = new Error();
					thenable = {};

					Object.defineProperty(thenable, 'then', {
						get: function () {
							throw expectedReason;
						}
					});

					wrapped = Promise.resolve(thenable);

					wrapped.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
						assert.strictEqual(reason, expectedReason);
					}));
				});
				test.suite('if then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise, where', function () {
					test.test('if/when resolvePromise is called with a value y, run Resolve(promise, y)', function () {
						var dfd = this.async(250);

						var expectedValue, resolver, rejector, thenable, wrapped, calledThis;

						thenable = {
							then: function (resolve, reject) {
								calledThis = this;
								resolver = resolve;
								rejector = reject;
							}
						};

						expectedValue = 'success';
						wrapped = Promise.resolve(thenable);

						wrapped.then(dfd.callback(function (success) {
							assert.strictEqual(calledThis, thenable);
							assert.strictEqual(success, expectedValue);
						}));

						resolver(expectedValue);
					});
					test.test('if/when rejectPromise is called with a reason r, reject promise with r', function () {
						var dfd = this.async(250);

						var expectedReason, rejector, thenable, wrapped;

						thenable = {
							then: function (resolve, reject) {
								rejector = reject;
							}
						};

						expectedReason = new Error();

						wrapped = Promise.resolve(thenable);

						wrapped.then(dfd.reject.bind(dfd), dfd.callback(function (reason) {
							assert.strictEqual(reason, expectedReason);
						}));

						rejector(expectedReason);
					});
					test.test('if both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored', function () {
						var dfd = this.async(250);

						var expectedReason, resolver, rejector, thenable, wrapped,
							calledRejected = 0;

						thenable = {
							then: function (resolve, reject) {
								resolver = resolve;
								rejector = reject;
							}
						};

						expectedReason = new Error();

						wrapped = Promise.resolve(thenable);

						wrapped.then(dfd.reject.bind(dfd), function (reason) {
							calledRejected++;
							assert.strictEqual(reason, expectedReason);
						});

						rejector(expectedReason);
						rejector(expectedReason);

						rejector('foo');

						resolver('bar');
						resolver('baz');

						setTimeout(dfd.callback(function () {
							assert.strictEqual(calledRejected, 1);
						}), 50);
					});
					test.suite('if calling then throws an exception e', function () {
						test.test('if resolvePromise or rejectPromise have been called, ignore it', function () {
							var dfd = this.async(250);

							var expectedValue, expectedReason, thenable, wrapped;

							expectedValue = 'success';
							expectedReason = new Error();

							thenable = {
								then: function (resolve) {
									resolve(expectedValue);
									throw expectedReason;
								}
							};

							wrapped = Promise.resolve(thenable);

							wrapped.then(dfd.callback(function (value) {
								assert(expectedValue, value);
							}));
						});
						test.test('otherwise, reject promise with e as the reason', function () {
							var dfd = this.async(250);

							var expectedReason, thenable, wrapped,
								callCount = 0;

							expectedReason = new Error();

							thenable = { then: function () { throw expectedReason; } };

							wrapped = Promise.resolve(thenable);

							wrapped.then(dfd.reject.bind(this), dfd.callback(function (reason) {
								callCount++;
								assert.strictEqual(expectedReason, reason);
							}));

							assert.strictEqual(callCount, 0);
						});
					});
				});
				test.test('if then is not a function, fulfill promise with x', function () {
					var dfd = this.async(250);

					var thenable = { then: 3 },
						callCount = 0,
						wrapped = Promise.resolve(thenable);

					wrapped.then(dfd.callback(function (value) {
						callCount++;
						assert.strictEqual(thenable, value);
					}));

					assert.strictEqual(callCount, 0);
				});
			});
			test.suite('if x is not an object or function,', function () {
				test.test('fulfill promise with x', function () {
					var dfd = this.async(250);

					var thenable = null,
						callCount = 0,
						wrapped = Promise.resolve(thenable);

					wrapped.then(dfd.callback(function (value) {
						callCount++;
						assert.strictEqual(value, thenable);
					}), dfd.reject.bind(dfd));

					assert.strictEqual(callCount, 0);
				});
			});
			test.test('if SameValue(constructor, C) is true, return x.', function () {
				var promise = Promise.resolve(1),
					casted = Promise.resolve(promise);

				assert.deepEqual(casted, promise);
			});
			test.test('if SameValue(constructor, C) is false, and isThenable(C) is true, return PromiseResolve(promise, x)', function () {
				var promise = { then: function () {} },
					casted = Promise.resolve(promise);

				assert.instanceOf(casted, Promise);
				assert.notStrictEqual(casted, promise);
			});
			test.test('if SameValue(constructor, C) is false, and isPromiseSubClass(C) is true, return PromiseResolve(promise, x)', function () {
				var dfd = this.async(250);

				function PromiseSubclass() {
					Promise.apply(this, arguments);
				}

				PromiseSubclass.prototype = Object.create(Promise.prototype);
				PromiseSubclass.prototype.constructor = PromiseSubclass;
				PromiseSubclass.resolve = Promise.resolve;

				var promise = Promise.resolve(1),
					casted = PromiseSubclass.resolve(promise);

				assert.instanceOf(casted, Promise);
				assert.instanceOf(casted, PromiseSubclass);
				assert.notStrictEqual(casted, promise);

				casted.then(dfd.callback(function (value) {
					assert.equal(value, 1);
				}));
			});
			test.test('if SameValue(constructor, C) is false, and isThenable(C) is false, return PromiseResolve(promise, x)', function () {
				var value = 1,
					casted = Promise.resolve(value);

				assert.instanceOf(casted, Promise);
				assert.notStrictEqual(casted, value);
			});
			test.test('casts null correctly', function () {
				var dfd = this.async(250);

				Promise.resolve(null).then(dfd.callback(function (value) {
					assert.equal(value, null);
				}));
			});
		});
		if (has('host-node')) {
			test.suite('using reduce to sum integers using promises', function () {
				test.test('should build the promise pipeline without error', function () {
					var array = [];

					for (var i = 1; i <= 1000; i++) {
						array.push(i);
					}

					var pZero = Promise.resolve(0);

					array.reduce(function (promise, nextVal) {
						return promise.then(function (currentVal) {
							return Promise.resolve(currentVal + nextVal);
						});
					}, pZero);
				});
				test.test('should get correct answer without blowing the nextTick stack', function () {
					var dfd = this.async(250);

					var array = [],
						iters = 1000,
						pZero = Promise.resolve(0);

					for (var i = 1; i <= iters; i++) {
						array.push(i);
					}

					var result = array.reduce(function (promise, nextVal) {
						return promise.then(function (currentVal) {
							return Promise.resolve(currentVal + nextVal);
						});
					}, pZero);

					result.then(dfd.callback(function (value) {
						assert.equal(value, (iters * (iters + 1) / 2));
					}));
				});
			});
		}
	});
});