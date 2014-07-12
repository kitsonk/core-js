define({
	proxyPort: 9000,
	proxyUrl: 'http://localhost:9000/',

	capabilities: {
		'selenium-version': '2.41.0'
	},

	environments: [
		{ browserName: 'internet explorer', version: '11.0', platform: 'win8' },
		{ browserName: 'internet explorer', version: '10.0', platform: 'win8' },
		{ browserName: 'internet explorer', version: '9.0', platform: 'windows' },
		{ browserName: 'firefox', version: '29.0', platform: 'windows' },
		{ browserName: 'chrome', version: '35.0', platform: 'win8' },
		{ browserName: 'safari', version: '6.1', platform: 'mac' },
		{ browserName: 'safari', version: '7.0', platform: 'mac' }
	],

	maxConcurrency: 2,

	tunnel: 'BrowserStackTunnel',

	useLoader: {
		'host-node': 'dojo/dojo',
		'host-browser': 'node_modules/dojo/dojo.js'
	},

	loader: {
		packages: [
			{ name: 'core', location: '.'}
		]
	},

	suites: [ 'core/tests/unit' ],

	functionalSuites: [],

	excludeInstrumentation: /^tests\/|^node_modules\//

});