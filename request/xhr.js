define([
	'../Deferred'
], function (Deferred) {
	'use strict';
	
	function xhr(url, options) {
		var deferred = new Deferred(function (reason) {
				request && request.abort();
				throw reason;
			}),
			request = new XMLHttpRequest(),
			response = {
				data: null,
				getHeader: function (name) {
					return request.getResponseHeader(name);
				},
				nativeResponse: request,
				requestOptions: options,
				statusCode: null,
				statusText: null,
				url: url
			};

		options = options || {};
		options.method = options.method || 'GET';

		if ((!options.user || !options.password) && options.auth) {
			(function () {
				var auth = options.auth.split(':');
				options.user = decodeURIComponent(auth[0]);
				options.password = decodeURIComponent(auth[1]);
			})();
		}

		request.open(options.method, url, !options.blockMainThread, options.user, options.password);

		request.onerror = function (event) {
			deferred.reject(event.error);
		};

		request.onload = function () {
			if (options.responseType === 'xml') {
				response.data = request.responseXML;
			}
			else {
				response.data = request.response;
			}

			response.statusCode = request.status;
			response.statusText = request.statusText;

			deferred.resolve(response);
		};

		request.onprogress = function (event) {
			deferred.progress(event);
		};

		if (options.timeout > 0 && options.timeout !== Infinity) {
			request.timeout = options.timeout;
		}

		for (var header in options.headers) {
			request.setRequestHeader(header, options.headers[header]);
		}

		request.send(options.data);

		return deferred.promise;
	}

	return xhr;
});