/* jshint node: true */

module.exports = function (grunt) {
	'use strict';

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jscs: {
			src: [
				'bot.js',
			],
			options: {
				config: '.jscsrc'
			}
		},
		jshint: {
			src: [
				'Gruntfile.js',
				'bot.js',
			],
			options: {
				jshintrc: '.jshintrc',
				reporter: require('jshint-summary')
			}
		},
		lintspaces: {
			src: [
				'Gruntfile.js',
				'.jshintrc',
				'bot.js',
			],
			options: {
				editorconfig: '.editorconfig',
				ignores: ['js-comments']
			}
		}
	});

	// Load any grunt plugins found in package.json.
	require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
	require('time-grunt')(grunt);

	grunt.registerTask('default', [
		'jscs',
		'jshint',
		'lintspaces'
	]);
};