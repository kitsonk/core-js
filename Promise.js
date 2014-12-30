define([
	'./has',
	'./async',
	'./properties',
	'./WeakMap'
], function (has, async, properties, WeakMap) {
	'use strict';

	/**
	 * core/Promise is based on es6-promise (https://github.com/jakearchibald/es6-promise) which is
	 * Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors
	 */

	var Promise;

	has.add('es6-promises', typeof (typeof window === 'object' ? window : global).Promise === 'function');

	/* path if there are no native promises */
	if (!has('es6-promises')) {
		var PENDING = void 0,
			SEALED = 0,
			FULFILLED = 1,
			REJECTED = 2;

		var states = new WeakMap(),
			details = new WeakMap(),
			subscribers = new WeakMap();

		/**
		 * Fulfill a promise with the supplied value
		 * @param  {Promise} promise The promise to fulfil
		 * @param  {Mixed}   value   The value to fulfil the promise with
		 */
		var fulfill = function (promise, value) {
			if (states.get(promise) !== PENDING) { return; }
			states.set(promise, SEALED);
			details.set(promise, value);

			async(function () {
				states.set(promise, FULFILLED);
				publish(promise, FULFILLED);
			});
		};

		/**
		 * Reject a promise with the supplied reason
		 * @param  {Promise} promise The promise to reject
		 * @param  {Mixed}   reason  The reason to pass on rejection
		 */
		var reject = function (promise, reason) {
			if (states.get(promise) !== PENDING) { return; }
			states.set(promise, SEALED);
			details.set(promise, reason);

			async(function () {
				states.set(promise, REJECTED);
				publish(promise, REJECTED);
			});
		};

		/**
		 * Handle the a value that appears to be thenable, chaining the promise
		 * @param  {Promise} promise The promise to set the then for
		 * @param  {Mixed}   value   The value to resolve the promise with, which should be thenable
		 * @return {Boolean}         True if the promise is handled
		 */
		var handleThenable = function (promise, value) {
			var then = null,
				resolved;

			try {
				if (promise === value) {
					throw new TypeError('A promises callback cannot return that same promise.');
				}

				if (value && (typeof value === 'function' || typeof value === 'object')) {
					then = value.then;
					if (typeof then === 'function') {
						then.call(value, function (v) {
							if (resolved) { return true; }
							resolved = true;

							if (value !== v) {
								resolve(promise, v);
							}
							else {
								fulfill(promise, v);
							}
						}, function (v) {
							if (resolved) { return true; }
							resolved = true;

							reject(promise, v);
						});

						return true;
					}
				}
			}
			catch (error) {
				if (resolved) { return true; }
				reject(promise, error);
				return true;
			}

			return false;
		};

		/**
		 * Resolve a promise with the supplied value
		 * @param  {Promise} promise The promise to resolve
		 * @param  {Mixed}   value   The value to resolve the promise with
		 */
		var resolve = function (promise, value) {
			if (promise === value) {
				fulfill(promise, value);
			}
			else if (!handleThenable(promise, value)) {
				fulfill(promise, value);
			}
		};

		/**
		 * Try to invoke the resolver of the promise
		 * @param  {Function} resolver The resolver function for a promise
		 * @param  {Promise}  promise  The promise to resolve
		 */
		var invokeResolver = function (resolver, promise) {
			function resolvePromise(value) {
				resolve(promise, value);
			}
			function rejectPromise(reason) {
				reject(promise, reason);
			}

			try {
				resolver(resolvePromise, rejectPromise);
			}
			catch (e) {
				rejectPromise(e);
			}
		};

		/**
		 * Invoke the callback of a promise
		 * @param  {Number}   settled  The status of the promise
		 * @param  {Promise}  promise  The promise
		 * @param  {Function} callback The callback function
		 * @param  {Mixed}    detail   The value or reason
		 */
		var invokeCallback = function (settled, promise, callback, detail) {
			var hasCallback = typeof callback === 'function',
				value, error, succeeded, failed;

			if (hasCallback) {
				try {
					value = callback(detail);
					succeeded = true;
				}
				catch (e) {
					failed = true;
					error = e;
				}
			}
			else {
				value = detail;
				succeeded = true;
			}

			if (handleThenable(promise, value)) {
				return;
			}
			else if (hasCallback && succeeded) {
				resolve(promise, value);
			}
			else if (failed) {
				reject(promise, error);
			}
			else if (settled === FULFILLED) {
				resolve(promise, value);
			}
			else if (settled === REJECTED) {
				reject(promise, value);
			}
		};

		/**
		 * Add a tuple of fulfillment and rejection callbacks to a Promise
		 * @param  {Promise} parent        The parent promise
		 * @param  {Promise} child         The child promise being chained
		 * @param  {Function} onFulfillment The fulfilment function
		 * @param  {Function} onRejection   The rejection function
		 */
		var subscribe = function (parent, child, onFulfillment, onRejection) {
			var parentSubscribers = subscribers.get(parent),
				length = parentSubscribers.length;

			parentSubscribers[length] = child;
			parentSubscribers[length + FULFILLED] = onFulfillment;
			parentSubscribers[length + REJECTED] = onRejection;
		};

		/**
		 * Publish the settlement of the promise
		 * @param  {Promise} promise The promise to be published
		 * @param  {Number}  settled The state to publish
		 */
		var publish = function (promise, settled) {
			var child,
				callback,
				promiseSubscribers = subscribers.get(promise),
				detail = details.get(promise);

			for (var i = 0; i < promiseSubscribers.length; i += 3) {
				child = promiseSubscribers[i];
				callback = promiseSubscribers[i + settled];

				invokeCallback(settled, child, callback, detail);
			}

			subscribers['delete'](promise);
		};

		/**
		 * Promise is an object which provides a mechanism for handling asyncronous code
		 * @param {Function} resolver The function that will be called that will resolve the promise
		 */
		Promise = function (resolver) {
			if (typeof resolver !== 'function') {
				throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
			}

			if (!(this instanceof Promise)) {
				throw new TypeError('Failed to construct "Promise": Please use the "new" operator, this object constructor cannot be called as a function.');
			}

			subscribers.set(this, []);

			invokeResolver(resolver, this);
		};

		Object.defineProperties(Promise.prototype, {
			constructor: properties.getValueDescriptor(Promise),

			/**
			 * The functions to call when the promise is fulfilled.
			 * @param  {Function} onFulfillment The function to call when the promise is fulfilled
			 * @param  {Function} onRejection   The function to call when the promise is rejected
			 * @return {Promise}                A promise that will be fulfilled when the callbacks have completed
			 */
			then: properties.getReadOnlyDescriptor(function (onFulfillment, onRejection) {
				var promise = this,
					state = states.get(promise),
					thenPromise = new this.constructor(function () {});

				if (state) {
					var callbacks = arguments;
					async(function invokePromiseCallback() {
						invokeCallback(state, thenPromise, callbacks[state - 1], details.get(promise));
					});
				}
				else {
					subscribe(this, thenPromise, onFulfillment, onRejection);
				}

				return thenPromise;
			}),

			/**
			 * The function to call when the promise is rejected.
			 * @param  {Function} onRejection The function to call when the promise is rejected
			 * @return {Promise}              A promise that will be fulfilled when the callback is completed
			 */
			'catch': properties.getReadOnlyDescriptor(function (onRejection) {
				return this.then(null, onRejection);
			})
		});

		/**
		 * Returns a promise that is fulfilled when all the passed promises are fulfilled.
		 * @param  {Array}   promises An array of promises
		 * @return {Promise}          A promise that is fulfilled with values returned from the promises
		 */
		Promise.all = function (promises) {
			if (!(promises instanceof Array)) {
				throw new TypeError('You must pass an array to `all`.');
			}

			var P = this;

			return new P(function (resolve, reject) {
				var results = [],
					remaining = promises.length,
					promise;

				if (remaining === 0) {
					resolve([]);
				}

				function resolveAll(index, value) {
					results[index] = value;
					if (--remaining === 0) {
						resolve(results);
					}
				}

				function resolver(index) {
					return function (value) {
						resolveAll(index, value);
					};
				}

				for (var i = 0; i < promises.length; i++) {
					promise = promises[i];

					if (promise && typeof promise.then === 'function') {
						promise.then(resolver(i), reject);
					}
					else {
						resolveAll(i, promise);
					}
				}
			});
		};

		/**
		 * Promise fulfils when the first promise passed is fulfilled
		 * @param  {Array}   promises An array of promises
		 * @return {Promise}          A promise that will be fulfilled with the value of returned from the first
		 *                            promise that is fulfilled.
		 */
		Promise.race = function (promises) {
			if (!(promises instanceof Array)) {
				throw new TypeError('You must pass an array to `race`.');
			}

			var P = this;

			return new P(function (resolve, reject) {
				var promise;

				for (var i = 0; i < promises.length; i++) {
					promise = promises[i];

					if (promise && typeof promise.then === 'function') {
						promise.then(resolve, reject);
					}
					else {
						resolve(promise);
					}
				}
			});
		};

		/**
		 * Takes an value and if that value is not a promise, will return a promise that is fulfilled with the value.
		 * If the value is a non-native promise, it will wrap it with a native promise that resolves when the non-
		 * native promise resolves.  If it is a native promise, it will simply pass it through.
		 * @param  {Mixed} value Any value, including native and non-native promises.
		 * @return {Promise}       A promise that will be fulfilled when the value is resolved.
		 */
		Promise.resolve = function (value) {
			var P = this;

			if (value && typeof value === 'object' && value instanceof P) {
				return value;
			}

			return new P(function (resolve) {
				resolve(value);
			});
		};

		/**
		 * Takes a reason and ensures that the reason is used to reject a promise.
		 * @param  {Mixed}   reason The reason
		 * @return {Promise}        A promise that is rejected with the passed reason
		 */
		Promise.reject = function (reason) {
			var P = this;

			return new P(function (resolve, reject) {
				reject(reason);
			});
		};
	}
	else {
		/* Return the native implementation of Promises */
		Promise = (typeof window === 'object' ? window : global).Promise;
	}

	return Promise;
});