define([
	'../has'
], function (has) {
	'use strict';

	has.add('es7-object-observe', typeof Object.observe === 'function' &&
		/\[native\scode\]/.test(Object.observe.toString()));
	has.add('es7-array-observe', typeof Array.observe === 'function' &&
		/\[native\scode\]/.test(Array.observe.toString()));

	return has;
});