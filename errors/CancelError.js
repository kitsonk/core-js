define(['./create'], function (create) {
	// module:
	//		dojo/errors/CancelError

	/*=====
	return function(){
		// summary:
		//		Default error if a promise is cancelled without a reason.
	};
	=====*/

	return create('CancelError', null, null, {
		dojoType: { value: 'cancel', configurable: true }
	});
});
