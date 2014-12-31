define([
	'../Evented',
	'../on',
	'../global',
	'../domReady'
], function (Evented, on, global, domReady) {
	'use strict';

	var newHash,
		oldHash;

	function getSegment(str) {
		var i = str.indexOf('#');
		return ~i ? str.substring(i + 1) : '';
	}

	function getHash() {
		return getSegment(location.href);
	}

	function setHash(hash, replace) {
		hash = hash.charAt(0) === '#' ? hash.substring(1) : hash;
		oldHash = getSegment(location.href);
		newHash = hash;
		location[replace ? 'replace' : 'assign']('#' + hash);
	}

	var hash = new Evented();

	hash.get = getHash;
	hash.set = setHash;
	hash.onchange = null;

	domReady(function () {
		on(global, 'hashchange', function (e) {
			/* IE does not support oldURL/newURL, filling oldHash/newHash, but will only work if hash.set used :-( */
			e.oldHash = 'oldURL' in e ? getSegment(e.oldURL) : oldHash;
			e.newHash = 'newURL' in e ? getSegment(e.newURL) : newHash;
			on.emit(hash, 'change', e);
		});
	});

	return hash;
});