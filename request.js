define([
	'./Registry',
	'./Promise',
	'./has!host-browser?./request/xhr:host-node?./request/node'
], function (Registry, Promise, defaultProvider) {
	'use strict';

	var request = function request(/*url, options*/) {
		var args = Array.prototype.slice.call(arguments),
			promise = request.providerRegistry.match(args).apply(null, args).then(function (response) {
				args.unshift(response);
				return new Promise(function (resolve) {
					resolve(request.filterRegistry.match.apply(request.filterRegistry, args).apply(null, args));
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

	request.providerRegistry = new Registry(defaultProvider);
	var filterRegistry = request.filterRegistry = new Registry(function (response) {
		return response;
	});

	filterRegistry.register(function (response, url, options) {
		/* jshint node:true */
		return (typeof response.data === 'string' || response.data instanceof Buffer)
			&& options.responseType === 'json';
	}, function (response) {
		response.data = JSON.parse(response.data);
		return response;
	});

	['delete', 'get', 'post', 'put'].forEach(function (method) {
		request[method] = function (url, options) {
			options = Object.create(options);
			options.method = method.toUpperCase();
			return request(url, options);
		};
	});

	return request;
});
