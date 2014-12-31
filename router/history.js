define([
	'../Evented',
	'../domReady',
	'../on',
	'../global'
], function (Evented, domReady, on, global) {

	var hist = new Evented(),
		pushState = history.pushState.bind(history),
		replaceState = history.replaceState.bind(history);

	hist.basePath = '';

	hist.init = function (basePath) {
		hist.basePath = basePath;
	};

	hist.get = function (basePath) {
		if (basePath) {
			this.basePath = basePath;
		}
		basePath = this.basePath;
		var path = location.pathname,
			hasBase = basePath ? path.indexOf(basePath) === 0 : false;
		return {
			pathname: hasBase ? path.substring(basePath.length) : path,
			search: location.search,
			hash: location.hash,
			state: history.state
		}
	};

	hist.set = function (path, state, replace) {
		var basePath = this.basePath;
		state = state || null;
		return (replace ? replaceState : pushState)(state, '', basePath ? basePath + path : path);
	};

	hist.onchange = null;

	domReady(function () {
		on(global, 'popstate', function (e) {
			var loc = e.target.location,
				basePath = this.basePath,
				hasBase = basePath ? path.indexOf(basePath) === 0 : false;
			e.pathname = hasBase ? loc.pathname.substring(basePath.length) : loc.pathname;
			e.search = loc.search;
			e.hash = loc.hash;
			on.emit(hist, 'change', e);
			return false;
		});
	});

	return hist;
});