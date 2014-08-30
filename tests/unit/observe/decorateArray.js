define([
	'intern!object',
	'intern/chai!assert',
	'../../../observe/decorateArray',
	'../../../observe/has'
], function (registerSuite, assert, decorateArray, has) {
	if (has('es7-object-observe')) {
		registerSuite({
			name: 'core/observe/decorateArray',
			'basic': function () {
				var array = [],
					handle = decorateArray(array);
				assert.isFunction(array.set);
				assert.isFunction(array.get);
				handle.remove();
				assert.isUndefined(array.get);
				assert.isUndefined(array.set);
			}
		});
	}
	else {
		var arrayMutators = [ 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift' ]
				.filter(function (mutator) {
					return mutator in Array.prototype;
				});

		registerSuite({
			name: 'core/observe/decorateArray',
			'basic': function () {
				var array = [],
					toStrings = [];

				toStrings = arrayMutators.map(function (mutator) {
					return array[mutator].toString();
				});
				
				var handle = decorateArray(array);

				arrayMutators.forEach(function (mutator, idx) {
					assert.isFunction(array[mutator]);
					assert.notEqual(toStrings[idx], array[mutator].toString());
				});
				assert.isFunction(array.set);
				assert.isFunction(array.get);
				handle.remove();
				assert.isUndefined(array.set);
				assert.isUndefined(array.get);
			}
		});
	}
});