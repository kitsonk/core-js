# core/observe

**core/observe** is a module that provides observation functionality that is similar to the
[Harmony `Object.observe`][harmony] functionality.  The problem is that currently the standard is still potentially
being evolved, has been moved to being part of ES7 and is not currently available in any stable browser implementation.
Also, the currently available shims/polyfills utilise a polling mechanism to monitor objects for changes.  This module
takes a different approach.

What it attempts to do is to redfine the properties of the object, using ES5 accessors, to accomplish similar
functionality.  This reduces the burden of observation to only occur when properties are actually change.  In addition
it has special handling for arrays that rewrites the methods that can manipulate the array so that changes are then
observed in arrays as well.

This approach does have some drawback and limitations.  First, directly creating and deleting new properties will go
unobserved.  The `.defineProperty()`, `.defineProperties()`, `.removeProperty()` and `.removeProperties()` can overcome
that limitation.  Also with arrays, directly assigning values elements of the array will go unobserved.  Each observed
array will be decorated with a `.set()` (as well as a convenience of a `.get()`) to address this limitation.

Because the change records produced by core/observe are functionally the same as `Object.observe`, when the browser
supports `Object.observe` it will offload it.  In addition, if you set the `has()` flag of `es7-object-observe` in a
build, it will optimise out the code needed to provide support when `Object.observe` isn't present.

The `.summary()`, `.array()` and `.path()` functions are inspired by Rafael Weinstein's [ChangeSummary][] work for
Polymer's [mdv][] and are designed to be an higher-order API for observation.

## Usage

Basic usage is simply to provide a callback on an object:

```js
require(['core/observe'], function (observe) {
	var obj = {
		foo: 'bar'
	};

	function callback (changeRecords) {
		console.log(changeRecords);
	}

	observe(obj, callback);

	obj.foo = 'baz';
}]);
```

This should output something like:

```js
[{
	type: 'updated',
	target: obj,
	name: 'foo',
	oldValue: 'bar'
}]
```

### .summary()

`observe.summary()` is a higher order function that provides a more actionable summary of changes to an object.  It
takes in the change records from the lower level observation API and provides a callback with those properties that
have been added, changed or removed, as well as a function to retrieve the previous value if required.  The callback is supplied with 4 arguments of `added`, `removed`, `changed` and `getOldValueFn`.  So something like this:

```js
require(['core/observe'], function (observe) {
	var obj = {
		foo: 'bar',
		baz: 1,
		bar: null
	};

	function callback (added, removed, changed, getOldValueFn) {
		console.log('added:', added);
		console.log('removed:', removed);
		console.log('changed:', changed);
		console.log('old foo:', getOldValueFn('foo'));
		console.log('old bar:', getOldValueFn('bar'));
	}

	observe.summary(obj, callback);

	obj.foo = 'qat';
	obj.baz = 2;
});
```

Would output:

```js
added: {}
removed: {}
changed: { foo: 'qat', baz: 2 }
old foo: bar
old baz: 1
```

### .array()

`observe.array()` is a higher order function which provides a callback with an array of "splices" which represent the
changes to the array.  If several changes are made to an array within a single turn, these changes will be collapsed
into the smallest set of changes to reproduce the array from its original state.  Each splice record contains the
index for the splice, any elements that were removed and a count of how many elements were added to the array.  All
changes to the array are expressed as splices.  To utilise this function, it would look something like this:

```js
require(['core/observe'], function (observe) {
	var arr = [ 1, 2, 3 ];

	function callback (splices) {
		splices.forEach(function (splice) {
			console.log(splice);
		});
	}

	observe.array(arr, callback);

	arr.push(4, 5, 6);
	arr.splice(1, 2, 7, 8);
});
```

Would output something like:

```
{ index: 3, removed: [], addedCount: 3 }
{ index: 1, removed: [ 2, 3 ], addedCount: 2 }
```

### .path()

`observe.path()` is a higher order function that makes it easier to be able to observe value changes on properties,
versus having to deal with interpreting the change records that would come from `observe()`.  It is designed to just
provide simple notification of the previous value of the property and the new value.  The callback is supplied with
two arguments of `newValue` and `oldValue`.  So something like this:

```js
require(['core/observe'], function (observe) {
	var obj = {
		foo: {
			bar: 'baz'
		}
	};

	function callback (newValue, oldValue) {
		console.log(newValue, oldValue);
	}

	observe.path(obj, 'foo.bar', callback);

	obj.foo.bar = 'qat';
});
```

Would output:

```js
qat baz
```

[harmony]: http://wiki.ecmascript.org/doku.php?id=harmony:observe
[ChangeSummary]: https://github.com/rafaelw/ChangeSummary
[mdv]: https://github.com/Polymer/mdv
