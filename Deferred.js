define([
	'./aspect',
	'./async',
	'./lang',
	'./errors/CancelError',
	'./Promise',
	'./WeakMap'
], function (aspect, async, lang, CancelError, Promise, WeakMap) {
	'use strict';

	var FULFILLED_ERROR_MESSAGE = 'This deferred has already been fulfilled.';

	var around = aspect.around;

	var progressSubscribers = new WeakMap();

	function publish(deferred, update) {
		var subscribers = progressSubscribers.get(deferred),
			callback,
			result;

		if (subscribers.length) {
			async(function asyncPublish() {
				for (var i = 0; i < subscribers.length; i++) {
					if (typeof result !== 'undefined') {
						update = result;
					}
					callback = subscribers[i];
					result = callback(update);
				}
			});
		}
	}

	/**
	 * Creates a new deferred, as an abstraction over (primarily) asynchronous operations. The deferred is the private
	 * interface that should not be returned to calling code.  That's what the `promise` is for.  See `core/Promise`.
	 * @param {Function} canceller Will be invoked if the deferred is cancelled.  The canceller receives the reason
	 *                             the deferred was cancelled as its argument.  The deferred is rejected with its
	 *                             return value, or a new `core/errors/CancelError` instance.
	 */
	var Deferred = function (canceller) {
		var resolver, rejector,
			pending = false,
			resolved = false,
			rejected = false,
			canceled = false;

		/* Create a promise for the deferred that also traps resolution in order to support querying the status
			of the promise. */
		var promise = this.promise = new Promise(function (resolve, reject) {
				resolver = resolve;
				rejector = reject;
			}).then(function (value) {
				resolved = true;
				pending = false;
				return value;
			}, function (reason) {
				rejected = true;
				pending = false;
				throw reason;
			});

		/* Provide a mechanism to wrap the promise.then so it can support accepting a progress handler, but all
			progress listeners will actuablly be attached to the deferred, since ES6 Promises don't support the
			concept */
		var aroundPromise = function aroundPromise(promiseThen) {
			return function aroundAdvice(callback, errback, progback) {
				if (progback) {
					progressSubscribers.get(deferred).push(progback);
				}
				var p = promiseThen.call(this, callback, errback);
				around(p, 'then', lang.bind(p, aroundPromise));
				return p;
			};
		};

		around(promise, 'then', aroundPromise);

		var deferred = this;

		/* Initiate the WeakMap for this instance of the deferred */
		progressSubscribers.set(deferred, []);

		/**
		 * Returns if the particular deferred has been resolved.  Deferreds are 
		 * @return {Boolean} Returns `true` if resolved or `false` if not resolved.
		 */
		this.isResolved = function () {
			return resolved;
		};

		/**
		 * Returns if the particular deferred has been rejected.
		 * @return {Boolean} Returns `true` if rejected or `false` if not rejected.
		 */
		this.isRejected = function () {
			return rejected;
		};

		/**
		 * Returns if a deferred has been either rejected or resolved.
		 * @return {Boolean} Returns `true` if fulfilled or `false` if not fulfilled.
		 */
		this.isFulfilled = function () {
			return resolved || rejected;
		};

		/**
		 * Returns if a deferred has been cancelled
		 * @return {Boolean} Returns `true` if cancelled or `false` if not cancelled.
		 */
		this.isCanceled = function () {
			return canceled;
		};

		/**
		 * Publishes a progress event, providing the update to the listener
		 * @param  {Mixed}   update The update to send to any listeners
		 * @param  {Boolean} strict If `true` and the deferred is fulfilled, then throw an error
		 * @return {Promise}        Returns the promise related to the deferred
		 */
		this.progress = function (update, strict) {
			if (!(rejected || resolved || pending)) {
				publish(deferred, update);
				return promise;
			}
			else if (strict === true) {
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}
			return promise;
		};

		/**
		 * Resolve the deferred with the provided value
		 * @param  {Mixed}   value  The value to resolve the deferred with
		 * @param  {Boolean} strict If `true` and the deferred is fulfilled, then throw an error
		 * @return {Promise}        Returns the promise related to the deferred
		 */
		this.resolve = function (value, strict) {
			if ((rejected || resolved || pending) && strict) {
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}
			pending = true;
			resolver(value);
			return promise;
		};

		/**
		 * Reject the deferred with the supplied reason
		 * @param  {Mixed} reason The reason for rejecting the promise (usually an error)
		 * @param  {Boolean} strict If `true` and the deferred is fulfilled, then throw an error
		 * @return {Promise}        Returns the promise related to the deferred
		 */
		this.reject = function (reason, strict) {
			if ((rejected || resolved || pending) && strict) {
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}
			pending = true;
			rejector(reason);
			return promise;
		};

		/**
		 * Provide the callbacks for when the deferred is fulfilled or signals progress
		 * @param  {Function|Promise}  callback The function or promise to invoke when the deferred is resolved
		 * @param  {Function|Promise?} errback The function or promise to invoke when the deferred is rejected
		 * @param  {Function?}         progback The function to invoke when the deferred signals progress
		 * @return {Promise}           A new promise that will be fulfilled when this one is fulfilled
		 */
		this.then = lang.bind(promise, promise.then);

		/**
		 * Cancel the deferred
		 * @param  {Mixed}   reason The reason the deferred is being cancelled
		 * @param  {Boolean} strict If the deferred is already fulfilled and `true` then throw an error
		 * @return {Mixed}          The final reason the deferred was cancelled
		 */
		this.cancel = function (reason, strict) {
			var fulfilled = (rejected || resolved || pending);
			if (!fulfilled) {
				// Cancel can be called even after the deferred is fulfilled
				if (canceller) {
					var returnedReason = canceller(reason);
					reason = typeof returnedReason === 'undefined' ? reason : returnedReason;
				}
				canceled = true;
				if (!fulfilled) {
					// Allow canceller to provide its own reason, but fall back to a CancelError
					if (typeof reason === 'undefined') {
						reason = new CancelError();
					}
					pending = true;
					rejector(reason);
				}
				return reason;
			}
			if (strict === true) {
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}
		};
	};

	Deferred.prototype.toString = function () {
		return '[object Deferred]';
	};

	return Deferred;
});