define([], function () {
	'use strict';
	
	return function (name, ctor, base, props) {
		base = base || Error;

		var ErrorCtor = function (message) {
			if (base === Error) {
				if (Error.captureStackTrace) {
					Error.captureStackTrace(this, ErrorCtor);
				}

				// Error.call() operates on the returned error
				// object rather than operating on |this|
				var err = Error.call(this, message),
					prop;

				// Copy own properties from err to |this|
				for (prop in err) {
					if (err.hasOwnProperty(prop)) {
						this[prop] = err[prop];
					}
				}

				// messsage is non-enumerable in ES5
				this.message = message;
				// stack is non-enumerable in at least Firefox
				this.stack = err.stack;
			}
			else {
				base.apply(this, arguments);
			}
			if (ctor) {
				ctor.apply(this, arguments);
			}
		};

		ErrorCtor.prototype = Object.create(base.prototype, props);
		ErrorCtor.prototype.name = name;
		ErrorCtor.prototype.constructor = ErrorCtor;

		return ErrorCtor;
	};
});
