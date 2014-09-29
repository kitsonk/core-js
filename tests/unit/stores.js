define([
	'../../stores/has!storage-indexeddb?./stores/IndexedDB',
	'./stores/JsonRest',
	'../../stores/has!storage-local?./stores/LocalStorage',
	'../../stores/has!storage-session?./stores/SessionStorage',
	'./stores/Memory',
	'./stores/util/simpleQueryEngine'
], 1);