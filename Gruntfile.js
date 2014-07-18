module.exports = function (grunt) {
	grunt.loadNpmTasks('intern');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		intern: {
			remote: {
				options: {
					runType: 'runner',
					config: 'tests/config',
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

		grunt.task.run('intern:' + target);
	});
};