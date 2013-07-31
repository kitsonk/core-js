var profile = (function () {
	var testResourceRe = /^core\/tests\//,

		copyOnly = function (filename, mid) {
			var list = {
				'core/package': 1,
				'core/package.json': 1,
				'core/tests': 1,
				'core/third_party': 1,
				'core/node_modules': 1
			};
			return (mid in list) ||
				/(png|jpg|jpeg|gif|tiff)$/.test(filename);
		};

	return {
		resourceTags: {
			test: function (filename, mid) {
				return testResourceRe.test(mid) || mid === 'core/tests';
			},

			copyOnly: function (filename, mid) {
				return copyOnly(filename, mid);
			},

			amd: function (filename, mid) {
				return !testResourceRe.test(mid) && !copyOnly(filename, mid) && /\.js$/.test(filename);
			}
		}
	};
})();