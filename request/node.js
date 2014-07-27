define([
	'../node!http',
	'../node!https',
	'../node!url',
	'../errors/CancelError',
	'../errors/RequestTimeoutError',
	'../Deferred',
	'../io-query'
], function (http, https, urlUtil, CancelError, RequestTimeoutError, Deferred, ioQuery) {
	'use strict';

	/* jshint node:true */

	var noop = function () {},
		objectToQuery = ioQuery.objectToQuery;

	function normalizeHeaders(headers) {
		var normalizedHeaders = {};
		for (var key in headers) {
			normalizedHeaders[key.toLowerCase()] = headers[key];
		}
		return normalizedHeaders;
	}

	function node(url, options) {
		var deferred = new Deferred(function (reason) {
				request && request.abort();
				return typeof reason === 'string' ? new CancelError(reason) : reason;
			}),
			promise = deferred.promise,
			hasQuestionMark = !!~url.indexOf('?');

		options = options || {};
		options.method = options.method || 'GET';

		/* TODO: Move to core/request? */
		if (options.query) {
			url += (hasQuestionMark ? '&' : '?') +
				(typeof options.query === 'object' ? objectToQuery(options.query) : options.query);
			hasQuestionMark = true;
		}

		if (options.preventCache) {
			url += (hasQuestionMark ? '&' : '?') + 'request.preventCache=' + (+(new Date()));
		}

		var parsedUrl = urlUtil.parse(options.proxy || url),
			socketOptions = options.socketOptions,
			timeout,
			request,
			response;

		var requestOptions = {
			agent: options.agent,
			auth: parsedUrl.auth || options.auth,
			ca: options.ca,
			cert: options.cert,
			ciphers: options.ciphers,
			headers: normalizeHeaders(options.headers || {}),
			host: parsedUrl.host,
			hostname: parsedUrl.hostname,
			key: options.key,
			localAddress: options.localAddress,
			method: options.method,
			passphrase: options.passphrase,
			path: parsedUrl.path,
			pfx: options.pfx,
			port: +parsedUrl.port,
			rejectUnauthorized: options.rejectUnauthorized,
			secureProtocol: options.secureProtocol,
			socketPath: options.socketPath
		};

		if (!('user-agent' in requestOptions.headers)) {
			requestOptions.headers['user-agent'] = 'core/2 Node.js/' + process.version.replace(/^v/, '');
		}

		if (options.proxy) {
			requestOptions.path = url;
			if (parsedUrl.auth) {
				requestOptions.headers['proxy-authorization'] = 'Basic ' +
					new Buffer(parsedUrl.auth).toString('base64');
			}

			(function () {
				var parsedUrl = urlUtil.parse(url);
				requestOptions.headers.host = parsedUrl.host;
				requestOptions.auth = parsedUrl.auth || options.auth;
			})();
		}

		if (!options.auth && (options.user || options.password)) {
			requestOptions.auth = encodeURIComponent(options.user || '') + ':' +
				encodeURIComponent(options.password || '');
		}

		request = (parsedUrl.protocol === 'https:' ? https : http).request(requestOptions);

		response = {
			data: null,
			getHeader: function (name) {
				return (this.nativeReponse && this.nativeReponse.headers[name.toLowerCase()]) || null;
			},
			requestOptions: options,
			statusCode: null,
			url: url
		};

		if (socketOptions) {
			if ('timeout' in socketOptions) {
				request.setTimeout(socketOptions.timeout);
			}
			if ('noDelay' in socketOptions) {
				request.setNoDelay(socketOptions.noDelay);
			}
			if ('keepAlive' in socketOptions) {
				var initialDelay = socketOptions.keepAlive;
				request.setSocketKeepAlive(initialDelay >= 0, initialDelay || 0);
			}
		}

		request.once('response', function (nativeResponse) {
			var data,
				loaded = 0,
				total = +nativeResponse.headers['content-length'];

			if (!options.streamData) {
				data = [];
			}

			response.nativeResponse = nativeResponse;

			options.streamEncoding && nativeResponse.setEncoding(options.streamEncoding);

			nativeResponse.on('data', function (chunk) {
				options.streamData || data.push(chunk);
				loaded += typeof chunk === 'string' ? Buffer.byteLength(chunk, options.streamEncoding) : chunk.length;
				deferred.progress({ type: 'data', chunk: chunk, loaded: loaded, total: total });
			});

			nativeResponse.once('end', function () {
				timeout && timeout.remove();

				if (!options.streamData) {
					response.data = options.streamEncoding ? data.join('') : Buffer.concat(data, loaded);
				}

				response.statusCode = nativeResponse.statusCode;
				response.statusText = nativeResponse.statusText;

				deferred.resolve(response);
			});
		});

		request.once('error', deferred.reject);

		if (options.data) {
			if (options.data.pipe) {
				options.data.pipe(request);
			}
			else {
				if (typeof options.data === 'object') {
					options.data = objectToQuery(options.data);
				}
				request.end(options.data, options.dataEncoding);
			}
		}
		else {
			request.end();
		}

		if (options.timeout > 0 && options.timeout !== Infinity) {
			timeout = (function () {
				var timer = setTimeout(function () {
					deferred.cancel(new RequestTimeoutError('Request timed out after ' + options.timeout + 'ms'));
				}, options.timeout);

				return {
					remove: function () {
						this.remove = noop;
						clearTimeout(timer);
					}
				};
			})();
		}

		promise.cancel = deferred.cancel;

		return promise;
	}

	return node;
});