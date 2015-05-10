define([
	'intern!object',
	'intern/chai!assert',
	'../../../router/Router'
], function (registerSuite, assert, Router) {
	registerSuite({
		name: 'core/router/Router',
		'basic': function () {
			var router = new Router();
			console.log(router);
			console.log(router.register(function () {}, 'blah'));
		}
	});
});