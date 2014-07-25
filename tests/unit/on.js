define([
	'intern!tdd',
	'intern/chai!assert',
	'../../on',
	'../../Evented',
	'../../has'
], function (test, assert, on, Evented, has) {
	test.suite('core/on', function () {
		test.test('order of operation', function () {
			var order = [],
				obj = new Evented();

			obj.oncustom = function (event) {
				order.push(event.a);
				return event.a + 1;
			};

			var signal = on.pausable(obj, 'custom', function (event) {
				order.push(0);
				return event.a + 1;
			});

			obj.oncustom({ a: 0 });

			var signal2 = on(obj, 'custom, foo', function (event) {
				order.push(event.a);
			});

			on.emit(obj, 'custom', { a: 3 });

			signal.pause();

			var signal3 = on(obj, 'custom', function () {
				order.push(3);
			}, true);

			on.emit(obj, 'custom', { a: 3 });

			signal2.remove();
			signal.resume();
			on.emit(obj, 'custom', { a: 6 });
			signal3.remove();

			on(obj, 'foo, custom', function () {
				order.push(4);
			}, true);

			signal.remove();

			on.emit(obj, 'custom', { a: 7 });

			assert.deepEqual(order, [ 0, 0, 3, 0, 3, 3, 3, 3, 6, 0, 3, 7, 4 ]);
		});
		if (has('dom')) {
			test.test('matches', function () {
				var div = document.body.appendChild(document.createElement('div')),
					div2 = div.appendChild(document.createElement('div')),
					span = div2.appendChild(document.createElement('span')),
					matchResult = [],
					signal = on(div, 'click', function (event) {
						matchResult.push(!!on.matches(event.target, 'span', this));
						matchResult.push(!!on.matches(event.target, 'div', this));
						matchResult.push(!!on.matches(event.target, 'div', this, false));
						matchResult.push(!!on.matches(event.target, 'body', this));
					});

				span.click();
				signal.remove();
				signal = on(div, 'click', function (event) {
					matchResult.push(!!on.matches(event.target, 'span', this));
					matchResult.push(!!on.matches(event.target, 'div', this));
				});
				div2.click();
				assert.deepEqual(matchResult, [ true, true, false, false, false, true ]);
			});
			test.test('multiple handlers', function () {
				var div = document.body.appendChild(document.createElement('div')),
					order = [],
					customEvent = function (target, listener) {
						return on(target, 'custom', listener);
					};

				on(div, 'a,b', function (event) {
					order.push(1 + event.type);
				});
				on(div, ['a', customEvent], function (event) {
					order.push(2 + event.type);
				});
				on.emit(div, 'a', {});
				on.emit(div, 'b', {});
				on.emit(div, 'custom', {});

				assert.deepEqual(order, [ '1a', '2a', '1b', '2custom' ]);
			});
			test.test('dom', function () {
				var div = document.body.appendChild(document.createElement('div')),
					span = div.appendChild(document.createElement('span'));

				var order = [],
					signal = on(div, 'custom', function (event) {
						order.push(event.a);
						event.addedProp += 'ue';
					});
				on(span, 'custom', function (event) {
					event.addedProp = 'val';
				});

				on.emit(div, 'custom', {
					target: div,
					currentTarget: div,
					relatedTarget: div,
					a: 0
				});
				on.emit(div, 'otherevent', { a: 0 });

				assert.equal(on.emit(span, 'custom', {
					a: 1,
					bubbles: true,
					cancelable: true
				}).addedProp, 'value');
				assert(on.emit(span, 'custom', {
					a: 1,
					bubbles: false,
					cancelable: true
				}));

				var signal2 = on.pausable(div, 'custom', function (event) {
					order.push(event.a + 1);
					event.preventDefault();
				});

				assert.isFalse(on.emit(span, 'custom', {
					a: 2,
					bubbles: true,
					cancelable: true
				}));

				signal2.pause();
				assert.equal(on.emit(span, 'custom', {
					a: 4,
					bubbles: true,
					cancelable: true
				}).type, 'custom');

				signal2.resume();
				signal.remove();
				assert.isFalse(on.emit(span, 'custom', {
					a: 4,
					bubbles: true,
					cancelable: true
				}));
				on(span, 'custom', function (event) {
					order.push(6);
					event.stopPropagation();
				});
				assert(on.emit(span, 'custom', {
					a: 1,
					bubbles: true,
					cancelable: true
				}));

				var button = span.appendChild(document.createElement('button')),
					defaultPrevented = false,
					signal2Fired = false;

				signal = on(span, 'click', function (event) {
					event.preventDefault();
				});
				signal2 = on(div, 'click', function (event) {
					order.push(7);
					signal2Fired = true;
					defaultPrevented = event.defaultPrevented;
				});

				button.click();
				assert.isTrue(signal2Fired);
				assert.isTrue(defaultPrevented);
				signal.remove();
				signal2.remove();

				signal = on(span, 'click', function (event) {
					event.preventDefault();
				});
				signal2 = on(div, 'click', function (event) {
					signal2Fired = true;
					defaultPrevented = event.defaultPrevented;
				});
				signal2Fired = false;
				on.emit(button, 'click', { bubbles: true, cancelable: true });
				assert.isTrue(signal2Fired);
				assert.isTrue(defaultPrevented);
				signal.remove();
				signal2.remove();

				var eventEmitted,
					iframe = document.body.appendChild(document.createElement('iframe')),
					globalObjects = [ document, window, iframe.contentWindow, iframe.contentDocument ||
						iframe.contentWindow.document ];
				globalObjects.forEach(function (globalObject) {
					eventEmitted = false;
					on(globalObject, 'custom-test-event', function () {
						eventEmitted = true;
					});
					on.emit(globalObject, 'custom-test-event', {});
					assert.isTrue(eventEmitted);
				});

				var textnodespan = div.appendChild(document.createElement('span'));
				textnodespan.className = 'textnode';
				textnodespan.innerHTML = 'text';
				on(document.body, '.textnode:click', function () {
					order.push(8);
				});
				on.emit(textnodespan.firstChild, 'click', { bubbles: true, cancelable: true });

				on(div, 'button:click', function () {
					order.push(9);
				});

				on(document, 'button:click', function () {}); // just doesn't throw

				on(div, on.selector(function (node) {
					return node.tagName === 'BUTTON';
				}, 'click'), function () {
					order.push(10);
				});
				button.click();

				assert.deepEqual(order, [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]);

				on(span, 'proertychange', function () {}); // just doesn't throw
			});
			test.test('focus', function () {
				var dfd = this.async(100);
				var div = document.body.appendChild(document.createElement('div')),
					input = div.appendChild(document.createElement('input')),
					otherInput = document.body.appendChild(document.createElement('input')),
					order = [];

				on(div, 'input:focusin', function () {
					order.push('in');
				});
				on(div, 'input:focusout', function () {
					order.push('out');
				});

				input.focus();
				otherInput.focus();

				setTimeout(dfd.callback(function () {
					assert.deepEqual(order, [ 'in', 'out' ]);
				}), 1);
			});
			test.test('extension event', function () {
				var div = document.body.appendChild(document.createElement('div')),
					span = div.appendChild(document.createElement('span')),
					order = [];

				span.setAttribute('foo', 2);

				var customEvent = function (target, listener) {
					return on(target, 'custom', listener);
				};

				on(div, customEvent, function (event) {
					order.push(event.a);
				});
				on(div, on.selector('span', customEvent), function () {
					order.push(+this.getAttribute('foo'));
				});
				on.emit(div, 'custom', { a: 0 });

				assert(on.emit(span, 'custom', {
					a: 1,
					bubbles: true,
					cancelable: true
				}));

				assert(on.emit(div, 'custom', {
					a: 3,
					bubbles: true,
					cancelable: true
				}));

				assert.deepEqual(order, [ 0, 1, 2, 3 ]);
			});
			test.test('stopImmediatePropagation', function () {
				var button = document.body.appendChild(document.createElement('button')),
					afterStop = false;
				on(button, 'click', function (event) {
					event.stopImmediatePropagation();
				});
				on(button, 'click', function () {
					afterStop = true;
				});
				button.click();
				assert.isFalse(afterStop);
			});
			test.test('event augmentation', function () {
				var div = document.body.appendChild(document.createElement('div')),
					button = div.appendChild(document.createElement('button')),
					testValue;

				on(button, 'click', function (event) {
					event.modified = true;
					event.test = 3;
				});
				on(div, 'click', function (event) {
					testValue = event.test;
				});
				button.click();
				assert.equal(testValue, 3);
			});
		}
		test.test('once', function () {
			var order = [],
				obj = new Evented();

			obj.on('custom', function (event) {
				order.push(event.a);
			});

			on.once(obj, 'custom', function () {
				order.push(1);
			});

			obj.emit('custom', { a: 0 });
			obj.oncustom({ a: 2 });

			assert.deepEqual(order, [ 0, 1, 2 ]);
		});
		if (has('touch')) {
			test.test('touch', function () {
				var div = document.body.appendChild(document.createElement('div'));
				on(div, 'touchstart', function (event) {
					assert('rotation' in event);
					assert('pageX' in event);
				});
				on.emit(div, 'touchstart', { changedTouches: [ { pageX: 100 } ] });
			});
		}
	});
});