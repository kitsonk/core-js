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
unobserved.  The `.defineProperty()` and `.removeProperty()` can overcome that limitation.  Also with arrays, directly
assigning values elements of the array will go unobserved.  Each observed array will be decorated with a `.set()` (as
well as a convenience of a `.get()`) to address this limitation.

Because the change records produced by core/observe are functionally the same as `Object.observe`, when the browser
supports `Object.observe` it will offload it.  In addition, if you set the `has()` flag of `es7-object-observe` in a
build, it will optimise out the code needed to provide support when `Object.observe` isn't present.

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

### .path()

`observe.path()` is a higher order function that makes it easier to be able to observe value changes on properties,
versus having to deal with interpreting the change records that would come from `observe()`.  It is designed to just
provide simple notification of the previous value of the property and the new value.  The callback is supplied with
two arguments of `oldValue` and `newValue`.  So something like this:

```js
require(['core/observe'], function (observe) {
	var obj = {
		foo: {
			bar: 'baz'
		}
	};

	function callback (oldValue, newValue) {
		console.log(oldValue, newValue);
	}

	observe.path(obj, 'foo.bar', callback);

	obj.foo.bar = 'qat';
});
```

Would output:

```js
baz qat
```

[harmony]: http://wiki.ecmascript.org/doku.php?id=harmony:observe
