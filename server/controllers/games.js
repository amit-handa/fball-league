'use strict';
let mongoose = require('mongoose');

let flcommon = require('fl-common'),
  logmeta = { module: __filename.substring(__dirname.length + 1, __filename.length - 3) },
  Game = mongoose.model('Game'),
  Team = mongoose.model( "Team" ),
  League = mongoose.model( "League" );

exports.initPub = function(app) {
  app.get("/v1/league/:leagueid/games", getGame);
  app.get("/v1/team/:team/games", getGame);
};

exports.initSecured = function(app) {
  app.post('/v1/league/:leagueid/game', flcommon.utils.util.isAdmin, addGame );
  app.put('/v1/game/:gameid', flcommon.utils.util.isAdmin, updateGame);
  app.del('/v1/game/:gameid', flcommon.utils.util.isAdmin, removeGame );
};

/*
gametime=p|n
p : past
n : upcoming
teamgame=h|a
h : home
a : away
gamedate=<date>
*/
function* getGame(next) {
  try {
    let leagueid = this.params.leagueid;
    let q = this.query;
    if (leagueid)
      q = { league: leagueid };

    if( this.params.teamid )  {
      if( this.params.teamgame ) {
        q.$or = [ this.params.teamgame.toLowerCase() === 'h' ? { homeTeamId : this.params.teamid } : { awayTeamId : this.params.teamid } ];
      } else q = { homeTeamId : this.params.teamid, awayTeamId : this.params.teamid };
    }

    if( this.query.gametime ) {
      if( this.query.gamedate )
        q.date = this.query.gametime.toLowerCase() === 'p' ? { $lt : this.query.gamedate } : { $gt : this.query.gamedate };
      else q.homeTeamGoals = this.query.gametime.toLowerCase() === 'p' ? { $ne : -2 } : { $eq : -2 };
    }

    let res = yield Game.find(q).sort( { date : -1 } ).exec();
    if (!res)
      this.throw('{ "err" : "Game not found" }', 404);

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

function* addGame(next) {
  let gamedesc = this.request.body.fields;
  try {
    let league = yield League.findById( this.params.leagueid ).exec();
    if( !league ) {
      this.status = 400;
      this.body = { err : "league doesnt exist" };
      return yield next;
    }
    gamedesc.league = this.params.leagueid;

    let teams = yield Team.find( { _id : { $in : [ gamedesc.homeTeamId, gamedesc.awayTeamId ] } } ).exec();
    if( teams.length !== 2 ) {
      this.status = 400;
      this.body = { err : "teams dont exist" };
      return yield next;
    }
    gamedesc.homeTeamName = teams.find( t => t._id.toHexString() === gamedesc.homeTeamId ).name;
    gamedesc.awayTeamName = teams.find( t => t._id.toHexString() === gamedesc.awayTeamId ).name;

    let newgame = yield new Game( gamedesc ).save();
    this.status = 200;
    this.response.body = newgame;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* updateGame(next) {
  let gameid = this.params.gameid;
  let gamedesc = this.request.body.fields;

  if( gamedesc.league ) {
    let league = yield League.findById( gamedesc.league ).exec();
    if( !league )
      this.throw( 400, "league doesnt exist" );
  }

  try {
    let game = yield Game.findById( gameid )
      .populate( { path : 'homeTeamId', select : 'league name' } )
      .populate( { path : 'awayTeamId', select : 'league name' } )
      .exec();

    gamedesc.modified = new Date();
    // it should be set internally
    delete gamedesc.homeTeamName;
    delete gamedesc.awayTeamName;

    let teams = yield Team.find( { _id : { $in : [ gamedesc.homeTeamId, gamedesc.awayTeamId ] } } ).select( 'name league').exec();
    let hometeam = game.homeTeamId;
    let awayteam = game.awayTeamId;
    let league = gamedesc.league || game.league;

    if( gamedesc.homeTeamId ) {
      hometeam = teams.find( t => t._id.toHexString() === gamedesc.homeTeamId );
      gamedesc.homeTeamName = awayteam.name;
    }

    if( gamedesc.awayTeamId ) {
      awayteam = teams.find( t => t._id.toHexString() === gamedesc.awayTeamId );
      gamedesc.awayTeamName = awayteam.name;
    }

    if( hometeam.league.toHexString() !== league ||
      awayteam.league.toHexString() !== league )
      this.throw( 400, "Teams belong to different leagues" );

    let updatedGame = yield Game.findOneAndUpdate({ _id: gameid }, { $set: gamedesc }, { new: true }).exec();
    this.status = 200;
    this.response.body = updatedGame;
    yield next;
  } catch (err) {
    this.log.error(logmeta, { err: err });
    this.status = err.status || 500;
    this.response.body = err.message;
    this.app.emit('error', err, this);
  }
}

function* removeGame(next) {
  let ctx = this;
  try {
    yield new Promise(function(resolve, reject){
			Game.findOne({_id: ctx.params.gameid}, function(err, game){
				if(err)
					reject(false);
				ctx.log.debug('game found: %j', game);
				if(!game)
					resolve( null );

				game.remove(function(err, doc){
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
