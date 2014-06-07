define([
	'../has',
	'../properties'
], function (has, properties) {
	'use strict';

	/* jslint node:true */

	has.add('es6-promise', typeof Promise === 'function');

	if (!has('es6-promise')) {
		var async;

		var MutationObserver = window ? (window.MutationObserver ||
				window.WebKitMutationObserver) : undefined;

		if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
			async = function (callback, binding) {
				process.nextTick(function () {
					callback.call(binding);
				});
			};
		}
		else if (MutationObserver) {
			var queue = [],

				observer = new MutationObserver(function () {
					var toProcess = queue.slice();
					queue = [];
					toProcess.forEach(function (tuple) {
						tuple[0].call(tuple[1]);
					});
				}),

				element = document.createElement('div');

			observer.observe(element, { attributes: true });

			// Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
			window.addEventListener('unload', function () {
				observer.disconnect();
				observer = null;
			});

			async = function (callback, binding) {
				queue.push([ callback, binding ]);
				element.setAttribute('drainQueue', 'drainQueue');
			};
		}
		else {
			async = function (callback, binding) {
				setTimeout(function () {
					callback.call(binding);
				}, 1);
			};
		}

		/**
		 * Promise Utilities
		 */

		var isThenable = function (any) {
			try {
				var f = any.then;
				if (typeof f === 'function') {
					return true;
				}
			}
			catch (e) { /* squelch */ }
			return false;
		};

		var AlreadyResolved = function (name) {
			Error.call(this, name);
		};
		AlreadyResolved.prototype = Object.create(Error.prototype);

		var Backlog = function () {
			var bl = [];
			bl.pump = function (value) {
				async(function () {
					var l = bl.length,
						x = 0;
					while (x < l) {
						x++;
						bl.shift()(value);
					}
				});
			};
			return bl;
		};

		/**
		 * Resolver Constructor
		 */
		
		var Resolver = function (future, fulfillCallbacks, rejectCallbacks, setValue, setError, setState) {
			var isResolved = false,
				resolver = this,
				fulfill = function (value) {
					async(function () {
						setState('fulfilled');
						setValue(value);
						fulfillCallbacks.pump(value);
					});
				},
				reject = function (reason) {
					async(function () {
						setState('rejected');
						setError(reason);
						rejectCallbacks.pump(reason);
					});
				},
				resolve = function (value) {
					if (isThenable(value)) {
						value.then(resolve, reject);
						return;
					}
					fulfill(value);
				},
				ifNotResolved = function (fn, name) {
					return function (value) {
						if (!isResolved) {
							isResolved = true;
							fn(value);
						}
						else {
							if (typeof console !== 'undefined') {
								console.error('Cannot resolve a Promise multiple times.');
							}
						}
					};
				};

			this.resolve = ifNotResolved(resolve, 'resolve');

			this.fulfill = ifNotResolved(fulfill, 'fulfill');

			this.reject = ifNotResolved(reject, 'reject');

			this.cancel = function () { resolver.reject(new Error('Cancel')); };

			this.timeout = function () { resolver.reject(new Error('Timeout')); };

			setState('pending');
		};

		var Promise = function (init) {
			var fulfillCallbacks = new Backlog(),
				rejectCallbacks = new Backlog(),
				value,
				error,
				state = 'pending';

			properties.pseudoPrivate(this, '_addAcceptCallback', function (cb) {
				fulfillCallbacks.push(cb);
				if (state === 'fulfilled') {
					fulfillCallbacks.pump(value);
				}
			});
			properties.pseudoPrivate(this, '_addRejectCallback', function (cb) {
				rejectCallbacks.push(cb);
				if (state === 'rejected') {
					rejectCallbacks.pump(error);
				}
			});

			var r = new Resolver(this, fulfillCallbacks, rejectCallbacks,
					function (v) { value = v; },
					function (e) { error = e; },
					function (s) { state = s; });

			try {
				if (init) {
					init(r);
				}
			}
			catch (e) {
				r.reject(e);
			}
		};

		var isCallback = function (any) {
			return (typeof any === 'function');
		};

		var wrap = function (callback, resolver, disposition) {
			if (!isCallback(callback)) {
				return resolver[disposition].bind(resolver);
			}

			return function () {
				try {
					var r = callback.apply(null, arguments);
					resolver.resolve(r);
				}
				catch (e) {
					resolver.reject(e);
				}
			};
		};

		var addCallbacks = function (onfulfill, onreject, scope) {
			if (isCallback(onfulfill)) {
				scope._addAcceptCallback(onfulfill);
			}
			if (isCallback(onreject)) {
				scope._addRejectCallback(onreject);
			}
			return scope;
		};

		Promise.prototype = Object.create(null, {
			'then': properties.getValueDescriptor(function (onfulfill, onreject) {
				var fn = this;
				return new Promise(function (r) {
					addCallbacks(wrap(onfulfill, r, 'resolve'), wrap(onreject, r, 'reject'), fn);
				});
			}),
			'catch': properties.getValueDescriptor(function (onreject) {
				var fn = this;
				return new Promise(function (r) {
					addCallbacks(null, wrap(onreject, r, 'reject'), fn);
				});
			})
		});

		Promise.isThenable = isThenable;

		var toPromiseList = function (list) {
			return Array.prototype.slice.call(list).map(Promise.resolve);
		};

		Promise.any = function (/* ...promisesOrValues */) {
			var promises = toPromiseList(arguments);
			return new Promise(function (r) {
				if (!promises.length) {
					r.reject('No promises passed to Promise.any()');
				}
				else {
					var resolved = false,
						firstSuccess = function (value) {
							if (resolved) { return; }
							resolved = true;
							r.resolve(value);
						},
						firstFailure = function (reason) {
							if (resolved) { return; }
							resolved = true;
							r.reject(reason);
						};
					promises.forEach(function (p) {
						p.then(firstSuccess, firstFailure);
					});
				}
			});
		};

		Promise.some = function (/* ...promisesOrValues */) {
			var promises = toPromiseList(arguments);
			return new Promise(function (r) {
				if (!promises.length) {
					r.reject('No promises passed to Promise.some()');
				}
				else {
					var count = 0,
						accumulateFailures = function () {
							count++;
							if (count === promises.length) {
								r.reject();
							}
						};
					promises.forEach(function (p) {
						p.then(r.resolve, accumulateFailures);
					});
				}
			});
		};

		Promise.fulfill = function (value) {
			return new Promise(function (r) {
				r.fulfill(value);
			});
		};

		Promise.resolve = function (value) {
			return new Promise(function (r) {
				r.resolve(value);
			});
		};

		Promise.reject = function (reason) {
			return new Promise(function (r) {
				r.reject(reason);
			});
		};
	}

	return Promise;
});