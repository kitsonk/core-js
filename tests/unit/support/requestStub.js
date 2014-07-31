define([
	'sinon'
], function (sinon) {
	var request = sinon.stub();

	request.get = request;
	request.put = request;
	request.post = request;
	request['delete'] = request;

	return request;
});