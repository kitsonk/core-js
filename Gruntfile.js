/* jshint node:true */
module.exports = function (grunt) {
	grunt.loadNpmTasks('intern');

	var req = (function () {
		require('intern/node_modules/dojo/dojo');
		return this.require;
	})();

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		intern: {
			local: {
				options: {
					runType: 'runner',
					config: 'tests/config',
					reporters: [ 'runner' ]
				}
			},
			remote: {
				options: {
					runType: 'runner',
					config: 'tests/config',
					reporters: [ 'runner' ]
				}
			},
			proxy: {
				options: {
					runType: 'runner',
					proxyOnly: true,
					config: 'tests/config.proxy',
					reporters: [ 'runner' ]
				}
			},
			node: {
				options: {
					runType: 'client',
					config: 'tests/config',
					reporters: [ 'console' ]
				}
			}
		}
	});

	var servicesServer;
	grunt.registerTask('proxy', function () {
		var done = this.async();
		req({
			baseUrl: __dirname,
			packages: [
				{ name: 'intern', location: 'node_modules/intern' },
				{ name: 'when', location: 'node_modules/when', main: 'when' },
				{ name: 'core', location: '.' }
			],
			map: {
				'*': {
					'intern/dojo': 'intern/node_modules/dojo'
				}
			}
		}, [ 'core/tests/services/main' ], function (services) {
			services.start().then(function (server) {
				servicesServer = server;
				done(true);
			});
		});
	});

	grunt.registerTask('test', function (target) {
		if (!target) {
			target = 'remote';
		}

		function addReporter(reporter) {
			var property = 'intern.' + target + '.options.reporters',
				value = grunt.config.get(property);

			if (value.indexOf(reporter) !== -1) {
				return;
			}

			value.push(reporter);
			grunt.config.set(property, value);
		}

		if (this.flags.coverage) {
			addReporter('lcovhtml');
		}
		if (this.flags.console) {
			addReporter('console');
		}

		grunt.task.run('proxy');

		grunt.task.run('intern:' + target);
	});
};