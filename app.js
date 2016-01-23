'use strict';

/**
 * Entry point for league mgr
 * Initiates database connection and starts listening for requests on configured port.
 */

/** * Dependencies */
let flcommon = require( 'fl-common'),
	config = require('./server/config/config');

/** * Initialize Utils, Libraries and Mongoose ODM */
flcommon.init( config );

let l = flcommon.logger.child( {'module': __filename.substring(__dirname.length+1, __filename.length-3)} ),
	co = require('co');

process.on( 'uncaughtException', ( err ) => { l.error( err, "uncaught Exception" ); });
process.on( 'uncaughtRejection', ( err ) => { l.error( err, "uncaught Rejection" ); });

var koa = require('koa'),
	koaConfig = require('./server/config/koa');

/** * create server, configure the router middleware */
co(function *() {
	yield flcommon.initDB();

	var app = module.exports = koa();

	app.init = co.wrap(function *() {
		l.info("Initiating app");
		koaConfig(app);

		l.info("Initiating web service at: ", config.app.port);
		app.server = app.listen(config.app.port);
	});

	/** * auto init if this app is not being initialized by another module (i.e. using require('./app').init();) */
	if (!module.parent) {
		l.info("Configuring web service");
		return app.init();
	}
}).then(() => {
	l.info('Web service started');
}).catch(err => {
	l.error( err, 'Error in initiating web service: ', err.message);
	process.exit(1);
});
