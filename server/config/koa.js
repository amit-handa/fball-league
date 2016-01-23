'use strict';

var fs = require('fs'),
	flcommon = require( 'fl-common' ),
	l = flcommon.logger.child( {'module': __filename.substring(__dirname.length+1, __filename.length-3)} ),
	config = flcommon.config,
	send = require('koa-send'),
	responseTime = require("koa-response-time"),
	jwt = require( 'koa-jwt' ),
	parse = require('koa-better-body'),
	compress = require("koa-compress"),
	route = require('koa-router');

let reqCount = 0;
module.exports = function (app) {
	app.use( function * ( next ) {
		this.req.connection.setTimeout( 0 );
		this.req.connection.setNoDelay( true );
		try {
			yield next;
		} catch( err ) {
      l.error({err:err});
      this.status = err.status || 500;
      this.body = err.message;
      this.app.emit('error', err, this);
		}
	});

	app.use(responseTime());
	app.use(compress({
		filter: function (content_type) {
			return /application\/json/i.test(content_type);
		}, threshold: 250
	}));

	let pubRouter = route();
	var secRouter = route();
	fs.readdirSync('./server/controllers').forEach( function (file) {
		let controller = require('../controllers/' + file);

		if( controller.initPub )
			controller.initPub( pubRouter );
		if( controller.initSecured )
			controller.initSecured( secRouter );
	});

	app.use(parse({multipart: true,formidable: {uploadDir: config.app.uploadDir}}));
	app.use( function*( next ) {
		this.log = l;
		l.debug("got req ", this.request);
		yield next;
	});

	// send static resources if any
	app.use(function*(next){
		if(!(/\/v\d+\//i.test(this.request.url)))
			yield send(this, this.path, {root: config.app.root});
		else {
			this.log.debug('JSON api request');
			yield next;
		}
	});

	app.use( pubRouter.routes() );
	app.use( function * ( next ) {
		if( pubRouter.match( this.path, this.method ).pathAndMethod.length )// if already routed, return;
		  return;
    else if(!this.headers.authorization && !this.headers.Authorization) {
        this.log.debug('Authorization header does not exists');
        this.status = 401;
        return;
    }
		yield next;
	});
	app.use( jwt( { secret : config.app.privateKey, algorithms : [ 'HS256' ] } ) );

	app.use( function*(next) {
		let User = require( 'mongoose' ).model( 'User' );
		let id = this.state.user._id;

		this.passport = {};
		this.passport.user = yield User.findById(id)
			.populate({path:'localities', select:'name users location'})
			.populate({path:'settings', select:'privacy notifications neighbors'})
			.select('-gcmTokens -resetToken -resetTokenExpiry -resetTokenValidated')
			.exec();

		if(!this.passport.user)	{
			this.status = 401;
			return;
		}
		yield next;
	});

	app.use(function * (next){
		let reqId = ++reqCount;

		l.debug({reqId: reqId, req: this.request, body: this.request.body});

		this.log = l.child({reqId: reqId, user: this.passport.user});
		yield next;

		//let body = (this.response.header['content-type'] !== 'application/octet-stream')? this.body : "Byte stream";

		l.debug({reqId: reqId, res: this.response});
	});
	app.use(secRouter.routes());
};
