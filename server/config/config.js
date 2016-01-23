'use strict';

/** * Environment variables and application configuration. */
var path = require('path'),
	_ = require('lodash');

var baseConfig = {
	app: {
		root: path.normalize(__dirname + '/../..'),
		env: process.env.NODE_ENV || 'dev',
		spin: '2609'
	}
};

// environment specific config overrides
var platformConfig = {
	dev: {
		log: {
			level : 'debug',
			path: __dirname + "/../../logs/fleague.log",
		},

		app: {
			privateKey : __dirname + "/../../keys/fleague",
			pubKey : __dirname + "/../../keys/fleague.pub",	// PEM encoded

			port: 9995,
			uploadDir: __dirname + "/../../uploads"
		},

		mongo: {
			seed : false,
			debug : true,
			dbhost : '127.0.1.1',
			dbname : 'fleague-dev',

			user : "",
			password : "",
		}
	},

	beta: {},

	prod: {}
};

// override the base configuration with the platform specific values
module.exports = _.merge(baseConfig, platformConfig[baseConfig.app.env]);
