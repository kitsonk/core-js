define([
	'intern!object',
	'intern/chai!assert',
	'../CallbackQueue'
], function (registerSuite, assert, CallbackQueue) {
	var queue;

    registerSuite({
        name: 'core/CallbackQueue',
        beforeEach: function () {
            queue = new CallbackQueue();
        },
        'calls callbacks': function () {
            var one = function () {
                one.called = true;
            };
            var two = function () {
                two.called = true;
            };

            queue.add(one);
            queue.add(two);

            queue.drain();

            assert.ok(one.called);
            assert.ok(two.called);
        },
        'removes correctly': {
            'handler after': function () {
                var one = function () {
                    one.called = true;
                    twoHandle.remove();
                };
                var two = function () {
                    two.called = true;
                };

                queue.add(one);
                var twoHandle = queue.add(two);

                queue.drain();

                assert.ok(one.called);
                assert.ok(!two.called);
            },
            'handler before': function () {
                var one = function () {
                    one.called = true;
                };
                var two = function () {
                    two.called = true;
                    oneHandle.remove();
                };

                var oneHandle = queue.add(one);
                queue.add(two);

                queue.drain();

                assert.ok(one.called);
                assert.ok(two.called);
            }
        },
        'adding during drain': function () {
            var one = function () {
                one.called = true;
                queue.add(two);
            };
            var two = function () {
                two.called = true;
            };

            queue.add(one);
            queue.drain();

            assert.ok(one.called, 'one should have been called');
            assert.ok(!two.called, 'two should not have been called');

            one.called = two.called = false;
            queue.drain();

            assert.ok(!one.called, 'one should not have been called');
            assert.ok(two.called, 'two should have been called');
        },
        'arguments': function () {
            var one = function () {
                one.args = Array.prototype.slice.call(arguments);
                one.called = true;
            };

            queue.add(one);
            queue.drain(1, 2, 3);

            assert.ok(one.called);
            assert.deepEqual(one.args, [1, 2, 3]);
        }
    });
});