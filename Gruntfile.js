'use strict';

module.exports = function (grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jscs: {
			src: [
				'bot.js',
				'config.js'
			],
			options: {
				config: '.jscsrc'
			}
		},
		jshint: {
			files: {
				src: [
					'Gruntfile.js',
					'bot.js',
					'config.js'
				]
			},
			options: {
				jshintrc: '.jshintrc',
				reporter: require('jshint-summary')
			}
		},
		eslint: {
			src: {
				src: '<%= jshint.files.src %>'
			},
			options: {
				config: '.eslintrc',
				format: require('eslint-stylish-config')
			}
		}
	});

	// Load any grunt plugins found in package.json.
	require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
	require('time-grunt')(grunt);

	grunt.registerTask('default', [
		'jscs',
		'jshint',
		'eslint',
	]);
};
