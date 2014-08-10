define([
	'../../Promise'
], function (Promise) {
	'use strict';
	
	var resolve = Promise.resolve.bind(Promise),
		arrayProto = Array.prototype,
		slice = arrayProto.slice,
		iteratorMethods = [ 'forEach', 'map', 'filter', 'every', 'some', 'reduce', 'reduceRight' ];

	/**
	 * Decorates a promise with a method derived from the Array.prototype wrapped in a promise that resolves when the
	 * promise is resolved
	 * @param  {Promise} promise The promise that is to be decorated
	 * @param  {String}  method  The name of the function from the Array prototype that should be decorated
	 */
	function decorate(promise, method) {
		promise[method] = function () {
			var args = slice.call(arguments);
			return promise.then(function (results) {
				return arrayProto[method].apply(results, args);
			});
		};
	}

	/**
	 * Takes results from a store query, wraps them in a promise if none provided, decorates with promise iterators and
	 * a total.
	 * @param  {Promise|Array} results The results that are to be wrapped and decorated
	 * @return {Promise}               The resulting promise that has been decorated.
	 */
	return function queryResults(results) {
		var resultsPromise = resolve(results);
		iteratorMethods.forEach(function (method) {
			decorate(resultsPromise, method);
		});
		resultsPromise.total = results.total || resultsPromise.then(function (results) {
			return results.length;
		});
		return resultsPromise;
	};
});