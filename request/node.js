define([
	'../node!http',
	'../node!https',
	'../node!url',
	'../Deferred',
], function (http, https, urlUtil, Deferred) {
	'use strict';

	/* jshint node:true */

	var noop = function () {};

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
				throw reason;
			}),
			promise = deferred.promise;

		options = options || {};
		options.method = options.method || 'GET';

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

				deferred.resolve(response);
			});
		});

		request.once('error', deferred.reject);

		if (options.data) {
			if (options.data.pipe) {
				options.data.pipe(request);
			}
			else {
				request.end(options.data, options.dataEncoding);
			}
		}
		else {
			request.end();
		}

		if (options.timeout > 0 && options.timeout !== Infinity) {
			timeout = (function () {
				var timer = setTimeout(function () {
					var error = new Error('Request timed out after ' + options.timeout + 'ms');
					error.name = 'RequestTimeoutError';
					deferred.cancel(error);
				}, options.timeout);

				return {
					remove: function () {
						this.remove = noop;
						clearTimeout(timer);
					}
				};
			})();
		}

		return promise;
	}

	return node;
});