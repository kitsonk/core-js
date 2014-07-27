define([
	'when',
	'when/delay',
	'core/io-query'
], function (when, delay, ioQuery) {

	function xml() {
		return {
			status: 200,
			headers: {
				'Content-Type': 'application/xml'
			},
			body: [
				'<?xml version="1.0" encoding="UTF-8" ?>',
				'<foo><bar baz="thonk">blargh</bar><bar>blah</bar></foo>'
			]
		};
	}

	return function (request) {
		var promise = when.promise(function (resolve) {
			function respond(data) {
				resolve({
					status: 200,
					headers: {
						'Content-Type': 'application/json'
					},
					body: [
						JSON.stringify({
							method: request.method,
							query: request.query,
							headers: request.headers,
							payload: data || null
						})
					]
				});
			}

			if (request.serviceURL.indexOf('/xml') > -1) {
				resolve(xml(request));
				return;
			}

			if (request.data) {
				resolve(request.data.then(function (data) {
					return {
						status: 200,
						headers: {
							'Content-Type': 'application/json'
						},
						body: [
							JSON.stringify(data)
						]
					};
				}));
				return;
			}

			if (request.method !== 'GET') {
				request.body.join().then(function (data) {
					respond(ioQuery.queryToObject(data));
				});
			}
			else {
				respond();
			}
		});

		var milliseconds = request.query.delay;
		if (milliseconds) {
			milliseconds = parseInt(milliseconds, 10);
			promise = delay(milliseconds, promise);
		}

		return promise;
	};
});