'use strict';

var flcommon = require('fl-common'),
	config = flcommon.config,
	bcrypt = flcommon.utils.bcrypt_thunk,
	jwt = require('koa-jwt'),
	mongoose = require('mongoose'),
	User = mongoose.model('User');

exports.initPub = function (app) {
	app.post("/v1/signup", signup);
	app.post("/v1/signin", signIn);
};

exports.initSecured = function (app) {
	app.get("/v1/auth", getUser);
	app.post("/v1/signout", signOut);
};

function * getUser( next ) {
	this.status = 200;
	this.body = this.passport.user;
}

/**
 * API to login into account using either, phone number or email id.
 * @param next
 */
function* signIn(next) {
	let user;
	try {
		let body = this.request.body.fields;

		let res = yield User.passwordMatches(body.userId, body.password);
		if( res.err ) {
			this.status = 401;
			this.response.body = res.err;
			return yield next;
		}

		user = res.user;
		this.response.set('Access-Control-Expose-Headers', 'authorization');
		this.response.set('authorization', jwt.sign( { _id: user._id }, config.app.privateKey ) );
		this.log.info("Fetched user details from db: %j", user.name);

		this.body = user;
	} catch (err) {
		this.log.info({err: err});
		this.status = err.status || 500;
		this.body = err.message;
		this.app.emit('error', err, this);
	}

	if (!user)
		this.throw("Passwords dont match", 401);

	yield next;
}

function *signOut(next) {
	try {
		this.status = 200;
		yield next;
	} catch (err) {
		this.log.error({err: err});
		this.status = err.status || 500;
		this.body = err.message;
		this.app.emit('error', err, this);
	}
}

/**
 * Creates a new user.
 * Do we need to sign in when the user signs up.
 */
function *signup(next) {
	try {
		var userDesc = this.request.body.fields;
		this.log.debug('signup : ', userDesc);

		if( !userDesc.phone || !flcommon.utils.util.isPhone( userDesc.phone ) )
			this.throw('Invalid phone number. Please specify phone number as: XXXXXXXXXX', 400);

    if (!this.query.pin || !(yield flcommon.utils.util.verifyPin(userDesc.phone, this.query.pin)))
      this.throw('{ "err" : "Unauthorized request to change password/phone" }', 400);

		if( !userDesc.leagues )
			userDesc.leagues = [];

    let salt = yield bcrypt.genSalt();
    userDesc.password = yield bcrypt.hash(userDesc.password, salt);

		var user = yield new User(userDesc).save();
		this.response.set('Access-Control-Expose-Headers', 'authorization');
		this.response.set('authorization', jwt.sign({_id: user._id}, config.app.privateKey));

		this.status = 201;
		this.body = user;

		yield next;
	} catch (err) {
		this.log.error({err: err});
		this.status = err.status || 500;
		this.body = err.message;
		this.app.emit('error', err, this);
	}
}
