define([
	'../Evented',
	'../on',
	'../global',
	'../domReady'
], function (Evented, on, global, domReady) {
	'use strict';

	function getSegment(str) {
		var i = str.indexOf('#');
		return ~i ? str.substring(i + 1) : '';
	}

	function getHash() {
		return getSegment(location.href);
	}

	function setHash(hash, replace) {
		if (hash.charAt(0) === '#') {
			hash = hash.substring(1);
		}
		if (replace) {
			location.replace('#' + hash);
		}
		else {
			location.href = '#' + hash;
		}
	}

	var hash = new Evented();

	hash.get = getHash;
	hash.set = setHash;
	hash.onchange = null;

	domReady(function () {
		on(global, 'hashchange', function (e) {
			/* IE does not support oldURL/newURL, shiming newURL, but only polling would provide oldURL :-( */
			if ('oldURL' in e) {
				e.oldHash = getSegment(e.oldURL);
			}
			e.newHash = getSegment(e.newURL = e.newURL || location.href);
			on.emit(hash, 'change', e);
		});
	});

	return hash;
});