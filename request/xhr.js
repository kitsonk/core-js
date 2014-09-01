define([
	'../has',
	'../io-query',
	'../Deferred',
	'../errors/CancelError',
	'../errors/RequestTimeoutError'
], function (has, ioQuery, Deferred, CancelError, RequestTimeoutError) {
	'use strict';

	has.add('xhr2-formdata', function (global) {
		return 'FormData' in global;
	});

	var objectToQuery = ioQuery.objectToQuery;
	
	function xhr(url, options) {
		var deferred = new Deferred(function (reason) {
				request && request.abort();
				return new CancelError(reason);
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
				statusText: null
			},
			hasQuestionMark = !!~url.indexOf('?');

		options = options || {};
		options.method = options.method || 'GET';

		if ((!options.user || !options.password) && options.auth) {
			(function () {
				var auth = options.auth.split(':');
				options.user = decodeURIComponent(auth[0]);
				options.password = decodeURIComponent(auth[1]);
			})();
		}

		/* Move to request? */
		if (options.query) {
			url += (hasQuestionMark ? '&' : '?') +
				(typeof options.query === 'object' ? objectToQuery(options.query) : options.query);
			hasQuestionMark = true;
		}

		if (options.preventCache) {
			url += (hasQuestionMark ? '&' : '?') + 'request.preventCache=' + (+(new Date()));
		}

		response.url = url;
		try {
			request.open(options.method, url, !options.blockMainThread, options.user, options.password);

			request.onerror = function (event) {
				deferred.reject(event.error);
			};

			request.ontimeout = function (event) {
				deferred.reject(new RequestTimeoutError('Request timed out in ' + event.target.timeout + ' milliseconds'));
			};

			request.onload = function () {
				if (options.responseType === 'xml') {
					response.data = request.responseXML;
				}
				else {
					response.data = request.response || request.responseText;
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

			if (has('xhr2-formdata') && options.data && options.data instanceof FormData) {
				request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				request.send(options.data);
			}
			else {
				request.send(typeof options.data === 'object' ? objectToQuery(options.data) : options.data);
			}
		} catch (e) {
			deferred.reject(e);
		}

		deferred.promise.cancel = deferred.cancel;

		return deferred.promise;
	}

	return xhr;
});