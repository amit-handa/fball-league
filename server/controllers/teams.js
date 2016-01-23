'use strict';
let mongoose = require('mongoose');

let flcommon = require('fl-common'),
  logmeta = { module: __filename.substring(__dirname.length + 1, __filename.length - 3) },
  Team = mongoose.model('Team'),
  Game = mongoose.model( 'Game' ),
  League = mongoose.model( 'League' );

exports.initPub = function(app) {
  app.get("/v1/league/:leagueid/teams", getTeam);
  app.get("/v1/team/:teamid", getTeam);
};

exports.initSecured = function(app) {
  app.post('/v1/league/:leagueid/team', flcommon.utils.util.isAdmin, addTeam );
  app.put('/v1/team/:teamid', flcommon.utils.util.isAdmin, updateTeam);
  app.del('/v1/team/:teamid', flcommon.utils.util.isAdmin, removeTeam );
};

function* getTeam(next) {
  try {
    let leagueid = this.params.leagueid;
    let teamid = this.params.teamid;
    let q = this.query;
    if (leagueid)
      q = { league: leagueid };
    if( teamid )
      q = { _id : teamid };
    let res = yield Team.find(q).exec();
    if (!res)
      this.throw('{ "err" : "Team not found" }', 404);

    if( teamid && res.length )
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

function* addTeam(next) {
  let teamdesc = this.request.body.fields;
  try {
    let league = yield League.findById( this.params.leagueid ).exec();
    if( !league ) {
      this.status = 400;
      this.body = { err : "league doesnt exist"};
      return yield next;
    }

    teamdesc.league = this.params.leagueid;
    let newteam = yield new Team( teamdesc ).save();
    this.status = 200;
    this.response.body = newteam;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* updateTeam(next) {
  let teamid = this.params.teamid;
  let teamdesc = this.request.body.fields;

  if( teamdesc.league ) {
    let league = yield League.findById( teamdesc.league ).exec();
    if( !league )
      this.throw( 400, "league doesnt exist" );
  }

  try {
    teamdesc.modified = new Date();
    let updatedTeam = yield Team.findOneAndUpdate({ _id: teamid }, { $set: teamdesc }, { new: true }).exec();

    if( teamdesc.name ) {
      yield Game.update( { homeTeamId : teamid }, { homeTeamName : teamdesc.name } ).exec();
      yield Game.update( { awayTeamId : teamid }, { awayTeamName : teamdesc.name } ).exec();
    }

    this.status = 200;
    this.response.body = updatedTeam;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* removeTeam(next) {
  let ctx = this;
  try {
    yield new Promise(function(resolve, reject){
			Team.findOne({_id: ctx.params.teamid}, function(err, team){
				if(err)
					reject(false);
				ctx.log.debug('team found: %j', team);
				if(!team)
					resolve( null );

				team.remove(function(err, doc){
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
