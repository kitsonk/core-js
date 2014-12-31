define({
	proxyPort: 9000,
	proxyUrl: 'http://localhost:9001/',

	capabilities: {
		'video-upload-on-pass': false,
		'max-duration': 300
	},

	environments: [
		{ browserName: 'internet explorer', version: '11', platform: 'Windows 8.1' },
		{ browserName: 'internet explorer', version: '10', platform: 'Windows 8' },
		{ browserName: 'internet explorer', version: [ '9', '10' ], platform: 'Windows 7' },
		{ browserName: 'chrome', version: '', platform: [ 'Linux', 'OS X 10.10', 'Windows XP', 'Windows 7', 'Windows 8', 'Windows 8.1' ] },
		{ browserName: 'firefox', version: '', platform: [ 'OS X 10.10', 'Windows 7', 'Windows XP', 'Linux' ] },
		// { browserName: 'safari', version: '6', platform: 'OS X 10.8' },
		{ browserName: 'safari', version: '7', platform: 'OS X 10.9' },
		{ browserName: 'safari', version: '8', platform: 'OS X 10.10' }
	],

	maxConcurrency: 3,

	tunnel: 'SauceLabsTunnel',

	useLoader: {
		'host-node': 'dojo/dojo',
		'host-browser': 'node_modules/dojo/dojo.js'
	},

	loader: {
		packages: [
			{ name: 'core', location: '.'},
			{ name: 'sutabu', location: 'node_modules/sutabu/lib' }
		]
	},

	suites: [ 'core/tests/unit' ],

	functionalSuites: [],

	excludeInstrumentation: /^tests\/|^node_modules\//

});