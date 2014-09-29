define([
	'intern!object',
	'intern/chai!assert',
	'../../../router/has',
	'../../../global'
], function (registerSuite, assert, has, global) {
	registerSuite({
		name: 'core/router/has',
		'html5-history': function () {
			if (global && global.window && global.window.history && 'pushState' in global.window.history) {
				assert.isTrue(has('html5-history'));
			}
			else {
				assert.isFalse(has('html5-history'));
			}
		},
		'html4-hashchange': function () {
			if (global && 'onhashchange' in global) {
				assert.isTrue(has('html4-hashchange'));
			}
			else {
				assert.isFalse(has('html4-hashchange'));
			}
		}
	});
});