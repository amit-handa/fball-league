'use strict';
let mongoose = require('mongoose');

let flcommon = require('fl-common'),
  logmeta = { module: __filename.substring(__dirname.length + 1, __filename.length - 3) },
  League = mongoose.model('League');

exports.initPub = function(app) {
  app.get("/v1/league", getLeague);
  app.get('/v1/league/:id', getLeague);
};

exports.initSecured = function(app) {
  app.post('/v1/league', flcommon.utils.util.isAdmin, addLeague );
  app.put('/v1/league/:leagueid', flcommon.utils.util.isAdmin, updateLeague );
  app.del('/v1/league/:leagueid', flcommon.utils.util.isAdmin, removeLeague );
};

function* addLeague(next) {
  let leaguedesc = this.request.body.fields;
  try {
    let newleague = yield new League( leaguedesc ).save();
    this.status = 200;
    this.response.body = newleague;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* getLeague(next) {
  try {
    let id = this.params.id;
    let q = this.query;
    if (id)
      q = { _id: id };
    else {
      if( this.query.season )
        q.season = +this.query.season;
      else q.season = new Date().getFullYear();
    }

    this.log.info(logmeta, "get league: %j", q);
    let res = yield League.find(q).exec();
    if (!res)
      this.throw('{ "err" : "League not found" }', 404);

    if (id)
      res = res[0];
    this.response.body = res;
    this.status = 200;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* updateLeague(next) {
  let ldesc = this.request.body.fields;
  try {
    ldesc.modified = new Date();
    let updatedLeague = yield League.findOneAndUpdate({ _id: this.params.leagueid }, { $set: ldesc }, { new: true }).exec();
    this.status = 200;
    this.response.body = updatedLeague;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* removeLeague(next) {
  let ctx = this;
  try {
    yield new Promise(function(resolve, reject){
			League.findOne({_id: ctx.params.leagueid}, function(err, league){
				if(err)
					reject(false);
				ctx.log.debug('league found: %j', league);
				if(!league)
					resolve( null );

				league.remove(function(err, doc){
					if(err) reject(err);
					ctx.log.debug('Removed status: ', doc);
					ctx.status = 200;
					resolve(doc);
				});
			});
		});
    this.status = 204;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}
