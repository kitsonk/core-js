define([
	'sutabu/stub'
], function (stub) {
	var request = stub();

	request.get = request;
	request.put = request;
	request.post = request;
	request['delete'] = request;

	return request;
});