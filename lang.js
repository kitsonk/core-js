define([
	'./properties',
	'./global'
], function (properties, global) {
	'use strict';

	var slice = Array.prototype.slice;

	function _mixin(dest, source, copyFunc) {
		// summary:
		//		Copies/adds all enumerable properties of source to dest; returns dest.
		// dest: Object
		//		The object to which to copy/add all properties contained in source.
		// source: Object
		//		The object from which to draw all properties to copy into dest.
		// copyFunc: Function?
		//		The process used to copy/add a property in source; defaults to Object.defineProperty.
		// returns:
		//		dest, as modified
		// description:
		//		All enumerable properties, including functions (sometimes termed "methods"), excluding any non-standard
		//		extensions found in Object.prototype, are copied/added to dest. Copying/adding each particular property
		//		is delegated to copyFunc (if any); this defaults to Object.defineProperty if no copyFunc is provided.
		//		Notice that by default, _mixin executes a so-called "shallow copy" and aggregate types are copied/added
		//		by reference.

		var name, value, empty = {};
		for (name in source) {
			value = source[name];
			// the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
			// inherited from Object.prototype.	 For example, if dest has a custom toString() method,
			// don't overwrite it with the toString() method that source inherited from Object.prototype
			if (!(name in dest) || (dest[name] !== value && (!(name in empty) || empty[name] !== value))) {
				// If already defined in dest or if there is a copyFunc supplied, just copy the value.
				if (copyFunc || name in dest) {
					dest[name] = copyFunc ? copyFunc(value) : value;
				} else {
					Object.defineProperty(dest, name, properties.getDescriptor(source, name));
				}
			}
		}

		return dest;
	}

	function _toArray(obj, offset, startWith) {
		return (startWith || []).concat(slice.call(obj, offset || 0));
	}

	function getProp(/*Array*/parts, /*Boolean*/create, /*Object*/context) {
		var p, i;

		if (!context) {
			context = global;
		}
		
		try {
			for (i = 0; i < parts.length; i++) {
				p = parts[i];
				if (!(p in context)) {
					if (create) {
						context[p] = {};
					}
					else {
						return; // return undefined
					}
				}
				context = context[p];
			}
			return context; // mixed
		}
		catch (e) {
			// "p in context" throws an exception when context is a number, boolean, etc. rather than an object,
			// so in that corner case just return undefined (by having no return statement)
		}
	}

	var lang = {
		// summary:
		//		This module defines Javascript language extensions.

		mixin: function (dest /*, sources...*/) {
			// summary:
			//		Copies/adds all properties of one or more sources to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source. If dest is falsy, then
			//		a new object is manufactured before copying/adding properties begins.
			// sources: Object...
			//		One of more objects from which to draw all properties to copy into dest. sources are processed
			//		left-to-right and if more than one of these objects contain the same property name, the right-most
			//		value "wins".
			// returns: Object
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added from sources to dest. sources are processed left to right.
			//		The Javascript assignment operator is used to copy/add each property; therefore, by default, mixin
			//		executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			// example:
			//		make a shallow copy of an object
			//	|	var copy = lang.mixin({}, source);
			// example:
			//		copy in properties from multiple objects
			//	|	var flattened = lang.mixin(
			//	|		{
			//	|			name: "Frylock",
			//	|			braces: true
			//	|		},
			//	|		{
			//	|			name: "Carl Brutanananadilewski"
			//	|		}
			//	|	);
			//	|
			//	|	// will print "Carl Brutanananadilewski"
			//	|	console.log(flattened.name);
			//	|	// will print "true"
			//	|	console.log(flattened.braces);

			if (!dest) {
				dest = {};
			}
			for (var i = 1, l = arguments.length; i < l; i++) {
				_mixin(dest, arguments[i]);
			}
			return dest; // Object
		},

		delegate: function (obj, props) {
			var d = Object.create(typeof obj === 'function' ? obj.prototype : obj || Object.prototype);
			return props ? _mixin(d, props) : d;
		},

		/*=====
		delegate: function(obj, props){
			// summary:
			//		Returns a new object which "looks" to obj for properties which it
			//		does not have a value for. Optionally takes a bag of properties to
			//		seed the returned object with initially.
			// description:
			//		This is a small implementation of the Boodman/Crockford delegation
			//		pattern in JavaScript. An intermediate object constructor mediates
			//		the prototype chain for the returned object, using it to delegate
			//		down to obj for property lookup when object-local lookup fails.
			//		This can be thought of similarly to ES4's "wrap", save that it does
			//		not act on types but rather on pure objects.
			// obj: Object
			//		The object to delegate to for properties not found directly on the
			//		return object or in props.
			// props: Object...
			//		an object containing properties to assign to the returned object
			// returns:
			//		an Object of anonymous type
			// example:
			//	|	var foo = { bar: "baz" };
			//	|	var thinger = lang.delegate(foo, { thud: "xyzzy"});
			//	|	thinger.bar == "baz"; // delegated to foo
			//	|	foo.thud == undefined; // by definition
			//	|	thinger.thud == "xyzzy"; // mixed in from props
			//	|	foo.bar = "thonk";
			//	|	thinger.bar == "thonk"; // still delegated to foo's bar
		}
		=====*/

		clone: function (object) {
			var returnValue;

			if (!object || typeof object !== 'object') {
				returnValue = object;
			}
			else if (object.nodeType && 'cloneNode' in object) {
				returnValue = object.cloneNode(true);
			}
			else {
				return Object.create(object);
			}

			return returnValue;
		},

		/**
		 * Return a function bound to a specific context (this). Supports late binding.
		 *
		 * @param {Object} object
		 * The object to which to bind the context. May be null except for late binding.
		 * @param {(function()|string)} method
		 * A function or method name to bind a context to. If a string is passed, the look-up
		 * will not happen until the bound function is invoked (late-binding).
		 * @param {...?} var_args
		 * Arguments to pass to the bound function.
		 * @returns {function()}
		 */
		bind: function (context, method/*, ...*/) {
			var extra = slice.call(arguments, 2);
			if (typeof method === 'string') {
				// late binding
				return function () {
					return context[method].apply(context, extra.concat(slice.call(arguments)));
				};
			}
			return method.bind.apply(method, [ context ].concat(extra));
		},

		extend: function (ctor/*, props*/) {
			// summary:
			//		Adds all properties and methods of props to constructor's
			//		prototype, making them available to all instances created with
			//		constructor.
			// ctor: Object
			//		Target constructor to extend.
			// props: Object
			//		One or more objects to mix into ctor.prototype
			for (var i = 1; i < arguments.length; i++) {
				_mixin(ctor.prototype, arguments[i]);
			}
			return ctor; // Object
		},

		setObject: function (name, value, context) {
			// summary:
			//		Set a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			//		Objects are created as needed along `path`. Returns the passed
			//		value if setting is successful or `undefined` if not.
			// name: String
			//		Path to a property, in the form "A.B.C".
			// value: anything
			//		value or object to place at location given by name
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		`dojo.global`.
			// example:
			//		set the value of `foo.bar.baz`, regardless of whether
			//		intermediate objects already exist:
			//	| lang.setObject("foo.bar.baz", value);
			// example:
			//		without `lang.setObject`, we often see code like this:
			//	| // ensure that intermediate objects are available
			//	| if(!obj["parent"]){ obj.parent = {}; }
			//	| if(!obj.parent["child"]){ obj.parent.child = {}; }
			//	| // now we can safely set the property
			//	| obj.parent.child.prop = "some value";
			//		whereas with `lang.setObject`, we can shorten that to:
			//	| lang.setObject("parent.child.prop", "some value", obj);

			var parts = name.split('.'), p = parts.pop(), obj = getProp(parts, true, context);
			return obj && p ? (obj[p] = value) : undefined; // Object
		},

		getObject: function (name, create, context) {
			// summary:
			//		Get a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			// name: String
			//		Path to an property, in the form "A.B.C".
			// create: Boolean?
			//		Optional. Defaults to `false`. If `true`, Objects will be
			//		created at any point along the 'path' that is undefined.
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			return getProp(name.split('.'), create, context); // Object
		},

		exists: function (name, obj) {
			// summary:
			//		determine if an object supports a given method
			// description:
			//		useful for longer api chains where you have to test each object in
			//		the chain. Useful for object and method detection.
			// name: String
			//		Path to an object, in the form "A.B.C".
			// obj: Object?
			//		Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			// example:
			//	| // define an object
			//	| var foo = {
			//	|		bar: { }
			//	| };
			//	|
			//	| // search the global scope
			//	| lang.exists("foo.bar"); // true
			//	| lang.exists("foo.bar.baz"); // false
			//	|
			//	| // search from a particular scope
			//	| lang.exists("bar", foo); // true
			//	| lang.exists("bar.baz", foo); // false
			return lang.getObject(name, false, obj) !== undefined; // Boolean
		},

		/**
		 * Remove all instances of a value from an array and return them.
		 * @param  {Array} haystack The array to search for the value to be removed.
		 * @param  {Any}   needle   The value to search for in the `haystack`.
		 * @return {Array}          Any instances of the `needle` that have been removed.
		 */
		spliceFromArray: function (haystack, needle) {
			var removed = [],
				i = 0;

			while ((i = haystack.indexOf(needle, i)) > -1) {
				removed.push(haystack.splice(i, 1)[0]);
			}

			return removed;
		}
	};

	return lang;
});