define([
	'../../on'
], function (on) {
	'use strict';
	
	return function emitEvent(store, type, options, response, object, id, query, results) {
		var e = {
				target: store,
				type: type,
				options: options
			};
		if (response !== undefined) {
			e.response = response;
		}
		if (object !== undefined) {
			e.object = object;
		}
		if (id !== undefined) {
			e.id = id;
		}
		if (query || results) {
			e.query = query;
			e.results = results;
		}
		on.emit(store, type, e);
	};
});