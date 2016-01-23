'use strict';
let mongoose = require('mongoose');

let flcommon = require('fl-common'),
  jwt = require('koa-jwt'),
  bcrypt = flcommon.utils.bcrypt_thunk,
  config = flcommon.config,
  logmeta = { module: __filename.substring(__dirname.length + 1, __filename.length - 3) },
  User = mongoose.model('User');

exports.initPub = function(app) {
  app.put("/v1/user/:userid", updateResetPassword);
};

exports.initSecured = function(app) {
  app.get('/v1/user', getUser);
  app.get('/v1/user/:id', getUser);
  app.put('/v1/user', updateUser);
  app.del('/v1/user', removeUser);
};

function* getUser(next) {
  try {
    let id = this.params.id;
    let q = this.query;
    if (id)
      q = { _id: id };
    this.log.info(logmeta, "get user: %j", q);
    let res = yield User.find(q).exec();
    if (!res)
      this.throw('{ "err" : "User not found" }', 404);
    if (id)
      res = res[0];
    this.response.body = res;
    this.status = 200;
    yield next;
  } catch (err) {
    this.log.error(logmeta, {
      err: err
    });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* updateResetPassword(next) {
  let userid = this.params.userid;
  let q = User.findUserQuery(userid);
  let user = yield User.findOne(q).exec();
  if (!user)
    this.throw('{ "err" : "tokens dont match" }', 401);
  this.passport = {};
  this.passport.user = user;
  yield updateUser.call(this, next);
}

function* updateUser(next) {
  let user = this.passport.user;
  try {
    let userDesc = this.request.body.fields;
    this.log.info(logmeta, 'Request body: ', userDesc, this.query, user.phone);
    this.log.info(logmeta, 'New User details to be saved: ', userDesc);
    if (userDesc.password || userDesc.phone) {
      if (!this.query.pin || !(yield flcommon.utils.util.verifyPin(userDesc.phone || user.phone, this.query.pin)))
        this.throw('{ "err" : "Unauthorized request to change password/phone" }', 400);
    }

    if( userDesc.leagues ) {
      if( !user.roles.find( r => r=== 'admin') )
        this.throw( '{ "err" : "non-admin cant change leagues"}', 400 );
    }
    
    if (userDesc.password) {
      var salt = yield bcrypt.genSalt();
      userDesc.password = yield bcrypt.hash(userDesc.password, salt);
      this.response.set('Access-Control-Expose-Headers', 'authorization');
      this.response.set('authorization', jwt.sign({ _id: user._id }, config.app.privateKey));
		}

    userDesc.modified = new Date();
    let updatedUser = yield User.findOneAndUpdate({ _id: user._id }, { $set: userDesc }, { new: true }).select('_id name phone email type').exec();
    let updatedUsero = updatedUser.toJSON();
    this.log.info(logmeta, "updated user ", updatedUsero);
    this.status = 200;
    this.response.body = updatedUsero;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* removeUser(next) {
  try {
    let user = this.passport.user;
    let results = yield User.findByIdAndRemove(user._id).exec();
    this.log.info(logmeta, "delete res: ", results);
    this.status = 204;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}
