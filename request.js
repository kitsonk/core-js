define([
	'./has',
	'./Registry',
	'./Promise',
	'./has!host-browser?./request/xhr:host-node?./request/node'
], function (has, Registry, Promise, defaultProvider) {
	'use strict';

	/**
	 * An API for making asynchronous requests to retrieve data.
	 * @param  {String}  url     The resource location for the data to be retrieved.
	 * @param  {Object?} options An object which supplies settings for the request.
	 * @return {Promise}         A promise that will be fulfilled when the request is complete or errors out. If
	 *                           completed, it will resolve with a response object where the data retrieved will be
	 *                           contained in `.data`.
	 */
	var request = function request(/*url, options*/) {
		var args = Array.prototype.slice.call(arguments),
			promise = providerRegistry.match.apply(providerRegistry, args).apply(null, args).then(function (response) {
				args.unshift(response);
				return new Promise(function (resolve) {
					resolve(filterRegistry.match.apply(filterRegistry, args).apply(null, args));
				}).then(function (filterResponse) {
					response.data = filterResponse.data;
					return response;
				});
			});

		promise.data = promise.then(function (response) {
			return response.data;
		});

		return promise;
	};

	var providerRegistry = request.providerRegistry = new Registry(defaultProvider);
	var filterRegistry = request.filterRegistry = new Registry(function (response) {
		return response;
	});

	filterRegistry.register(function (response, url, options) {
		/* jshint node:true */
		if (has('host-node')) {
			return (typeof response.data === 'string' || response.data instanceof Buffer)
				&& options && options.responseType === 'json';
		}
		else {
			return typeof response.data === 'string' && options && options.responseType === 'json';
		}
	}, function (response) {
		response.data = JSON.parse(response.data);
		return response;
	});

	/* Decorate request with common methods */
	['delete', 'get', 'post', 'put'].forEach(function (method) {
		request[method] = function (url, options) {
			options = options ? Object.create(options) : {};
			options.method = method.toUpperCase();
			return request(url, options);
		};
	});

	return request;
});
