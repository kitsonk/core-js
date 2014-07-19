# core #

[![Build Status](https://travis-ci.org/kitsonk/core.svg?branch=master)](https://travis-ci.org/kitsonk/core)

This is an experimental prototype package of what might constitute the core of Dojo 2.  It is here in order to support
other packages that I am working on.

Other features that vary it from Dojo 1.X:
 * Provides an AMD ES6 Polyfill for Promises
 * Embraces ES5 where possible
 * Utilises strict mode where possible
 * Provides an efficient asynchronous API
 * Provides a Harmony-like observation API that works with ES5
 * Has a WeakMap like functionality that works with ES5

All the unit tests are written to be run under [Intern][intern].

[dojo]: https://github.com/dojo/dojo
[compose]: https://github.com/kriszyp/compose
[put-selector]: https://github.com/kriszyp/put-selector
[promises]: https://github.com/slightlyoff/Promises
[intern]: http://theintern.io/
