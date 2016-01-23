'use strict';

/**
 * Environment variables and application configuration.
 */
var path = require('path'),
	_ = require('lodash');

var baseConfig = {
	app: {
		root: path.normalize(__dirname + '/../..'),
		env: process.env.NODE_ENV,

		secret: process.env.SECRET || 'NQtV5zDQjVqg9vofDSEmX7WA+wXhBhjaxengpeyFh7AANWoMEPe+qebTViYb7db6fAEJJK+tWP8KEh4J10PAFQ==' /* used in signing the jwt tokens */,
		secretAuth : 'AIzaSyAFOWf-Ab7qRygbnaEI0elb4mDmQWOWaLQ',
		su: 'admin@socialdoor.com',
		pass: process.env.PASS || 'socialdoor@123', /* generic password for seed user logins */

		uploadDir: __dirname + '/../uploads'
	}
};

// environment specific config overrides
var platformConfig = {
	development: {
		log: {
			level : 'debug',
			path: __dirname + '/../logs/socialdoor.log'
		},

		app: {
			googleKey: 'AIzaSyB8bR0Y51J96peJs8-OLX7y8OPb_IO-juw',
			smsApiKey: 'A6a7e455d2804cd838738ac18122c1d19',
			smsSender: 'SPEDGE',

			port: 9595,
			nearDist : 15000,	// near distance for communities
			useSms: true
		},

		notification : {
			gcmApiKey: 'AIzaSyBsBEhhCTXx1szjzjVT4Sbhv0UesgmIxRc',
			gcmRefresh : 30,
			notiRefresh : 10
		},

		email : {
			smtp : 'lb1',
			account : 'Social Door <info@social-door.com>',
			host: 'localhost',
			port: 25
		},

		reso : {
			profile : { w : 960, h : 1440 },
			homeScreen : { w : 840, h : 1292 },
			innerScreen : { w : 840, h : 1440 },
			avatar : { w: 144, h: 144 }
		},

		mongo: {
			seed : false,
			dbname : 'socialdoor-dev',
			url: process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/socialdoor-dev',
			oplogUrl: 'mongodb://127.0.0.1:27017/local',
			oplogColl: 'oplog.rs'
		},

		redis: {
			url: '127.0.0.1',
			port: 6379,
			options: {}
		}
	},

	test: {
		app: {
			port: 3001
		},
		mongo: {
			dbname : 'socialdoor-test',
			url: 'mongodb://127.0.0.1:27017/socialdoor-test'
		}
	},

	production: {
		app: {
			port: process.env.PORT || 3000,
			cacheTime: 7 * 24 * 60 * 60 * 1000 /* default caching time (7 days) for static files, calculated in milliseconds */
		},
		mongo: {
			dbname : 'socialdoor',
			url: process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/socialdoor'
		}
	}
};

// override the base configuration with the platform specific values
module.exports = _.merge(baseConfig, platformConfig[baseConfig.app.env || (baseConfig.app.env = 'development')]);
