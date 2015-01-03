define(['./create'], function (create) {
	'use strict';
	// module:
	//		dojo/errors/RequestError

	/*=====
	 return function(){
		 // summary:
		 //		TODOC
	 };
	 =====*/

	return create('RequestError', function (message, response) {
		this.response = response;
	});
});
