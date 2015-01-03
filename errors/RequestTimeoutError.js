define(['./create', './RequestError'], function (create, RequestError) {
	'use strict';
	
	// module:
	//		dojo/errors/RequestTimeoutError

	/*=====
	 return function(){
		 // summary:
		 //		TODOC
	 };
	 =====*/

	return create('RequestTimeoutError', null, RequestError, {
		dojoType: { value: 'timeout', configurable: true }
	});
});
