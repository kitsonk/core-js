define([
	'../on',
	'./add',
	'./modify',
	'./remove'
], function (on, add, modify, remove) {
	'use strict';

	var nodeListDescriptors = {
		on: {
			value: function (type, listener) {
				var handles = this.map(function (node) {
					return on(node, type, listener);
				});
				handles.remove = function () {
					handles.forEach(function (handle) {
						handle.remove();
					});
				};
				return handles;
			},
			configurable: true
		},
		add: {
			value: function (/* selectors... */) {
				var self = this,
					args = Array.prototype.slice.call(arguments);
				return decorate.call(self, self.map(function (node) {
					return add.apply(self, [ node ].concat(args));
				}));
			},
			configurable: true
		},
		modify: {
			value: function (/* selectors... */) {
				var self = this,
					args = Array.prototype.slice.call(arguments);
				return self.map(function (node) {
					return modify.apply(self, [ node ].concat(args));
				});
			},
			configurable: true
		},
		remove: {
			value: function () {
				this.forEach(function (node) {
					remove(node);
				});
			},
			configurable: true
		}
	};

	function decorate(nodes) {
		if (!nodes) {
			return nodes;
		}
		Object.defineProperties(nodes, nodeListDescriptors);
		if (this && this.doc) {
			Object.defineProperty(nodes, 'doc', {
				value: this.doc,
				configurable: true
			});
		}
		return nodes;
	}

	return decorate;
});