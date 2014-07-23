define([
	'../../Promise'
], function (Promise) {
	var resolve = Promise.resolve.bind(Promise),
		arrayProto = Array.prototype,
		slice = arrayProto.slice,
		iteratorMethods = [ 'forEach', 'map', 'filter' ];

	function decorate(object, method) {
		object[method] = function () {
			var args = slice.call(arguments);
			return object.then(function (results) {
				return arrayProto[method].apply(results, args);
			});
		};
	}

	return function queryResults(results) {
		var resultsPromise = resolve(results);
		iteratorMethods.forEach(function (method) {
			decorate(resultsPromise, method);
		});
		resultsPromise.total = resultsPromise.then(function (results) {
			return results.length;
		});
		return resultsPromise;
	};
});