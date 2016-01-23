#!/usr/local/bin/node
// cron entry : 18 13 * * * cd /home/leaguemgr/fleague && ./scripts/insertLeague.js -y 2015

"use strict";

var prog = require('commander');
let co = require( 'co' );
let request = require( 'co-request' );

let leaguename = 'PL';
let season = new Date().getFullYear();
let server = 'http://localhost:9995';

prog
  .version("1.0")
  .usage('[options]' )
  .option('-l --leaguename <string>', `league name to populate, default ${leaguename}`)
  .option('-y --year <string>', `season to populate, default ${season}`)
  .option('-s --server <string>', `http server uri to use, defaults to ${server}`)
  .parse(process.argv);

prog.on('--help', function () {
  console.log('  Examples:');
  console.log('    %s -s http://localhost:9995 -y 2016 -l "BPL"', prog._name );
});

process.on('SIGINT', function () {
  console.log('\nUser interrupt: exiting...');
  process.exit(1);
});

if( prog.leaguename )
  leaguename = prog.leaguename;
if( prog.year )
  season = parseInt( prog.year, 10 );
if( prog.server )
  server = prog.server;

let fdserver = 'http://api.football-data.org';
let fdapikey = '75e849c09ea84724a4f30043b52e08e2';

co( function* () {
  let fdleague = yield getLeague( leaguename, season );
  let sleague = yield addLeague( fdleague, leaguename, season );

  let fdteams = yield getTeams( fdleague );
  let res = yield addTeams( fdteams, sleague );
  let steams = res.steams;
  let teamsh = res.teamsh;

  let fdgames = yield getGames( fdleague );
  return yield addGames( fdgames, sleague, steams, teamsh );
}).then( val => {
  console.log( 'done', val );
}).catch( err => {
  console.error( "err in populating league", err );
});

function * getTeams( fdleague ) {
  let fdteams = yield request( {
    url : fdserver + `/v1/soccerseasons/${fdleague.id}/teams`,
    headers : { "X-Auth-Token" : fdapikey }
  });

  if( fdteams.statusCode > 299 )
    throw new Error( "err in getting fd teams ", fdteams.statusCode );

  fdteams = JSON.parse( fdteams.body ).teams;
  return fdteams;
}

/*
{ "id": 66, "name": "Manchester United FC", "shortName": "ManU", "squadMarketValue": "377,250,000 €", "crestUrl": "http://upload.wikimedia.org/wikipedia/de/d/da/Manchester_United_FC.svg" }
{ name nickName site league }
*/
function * addTeams( fdteams, sleague ) {
  let authorization = yield getAdmin();

  let ps = yield fdteams.map( fdteam => request( {
      url : server + `/v1/league/${sleague._id}/team`,
      method : "POST",
      json : { name : fdteam.name, nickName : fdteam.shortName, site : fdteam.crestUrl },
      headers : { authorization : authorization }
    }) );

  let teams = ps.map( p => p.body );
  let teamsh = {};
  for( let i = 0; i < fdteams.length; i++ ) {
    teamsh[fdteams[i].name] = teams[i];
  }
  return { steams : teams, teamsh : teamsh };
}

function * getGames( fdleague ) {
  let fdgames = yield request( {
    url : fdserver + `/v1/soccerseasons/${fdleague.id}/fixtures`,
    headers : { "X-Auth-Token" : fdapikey }
  });

  if( fdgames.statusCode > 299 )
    throw new Error( "err in getting fd games ", fdgames.statusCode );

  fdgames = JSON.parse( fdgames.body ).fixtures;
  return fdgames;
}

/*
{
  "id": 147011, "soccerseasonId": 398, "date": "2015-10-03T11:45:00Z", "matchday": 8, "homeTeamName": "Crystal Palace FC", "homeTeamId": 354, "awayTeamName": "West Bromwich Albion FC", "awayTeamId": 74, "result": { "goalsHomeTeam": 2, "goalsAwayTeam": 0 }
}
{ league, date homeTeamId homeTeamName awayTeamId awayTeamName homeTeamGoals awayTeamGoals modified }
*/
function * addGames( fdgames, sleague, steams, teamsh ) {
  let authorization = yield getAdmin();

  let ps = [];
  for( let i = 0; i < fdgames.length; i++ ) {
    let fdgame = fdgames[i];

    let sgame = { date : fdgame.date,
      homeTeamId : teamsh[fdgame.homeTeamName]._id,
      awayTeamId : teamsh[fdgame.awayTeamName]._id
    };
    if( fdgame.status !== 'TIMED' && fdgame.result ) {
      sgame.homeTeamGoals = fdgame.result.goalsHomeTeam;
      sgame.awayTeamGoals = fdgame.result.goalsAwayTeam;
    }

    ps.push( yield request( {
      url : server + `/v1/league/${sleague._id}/game`,
      method : "POST",
      json : sgame,
      headers : { authorization : authorization }
    }) );
  }
  yield ps;

  let games = ps.map( p => p.body );
  return games;
}

let authorization;
function * getAdmin() {
  if( authorization )
    return authorization;

  let signin = yield request( {
    url : server + '/v1/signin',
    method : 'POST',
    json : { userId : "9711993235", password: "fl@123" }
  });

  if( signin.statusCode > 299 )
    throw new Error( "err in signing as admin into server ", signin.statusCode );

  authorization = 'bearer ' + signin.headers.authorization;
  return authorization;
}

// create or delete earlier and recreate
function * addLeague( fdleague, leaguename, season ) {
  let authorization = yield getAdmin();

  // find server leagues
  let sleagues = yield request( {
    url : server + `/v1/league?season=${season}`
  });

  if( sleagues.statusCode > 299 )
    throw new Error( "err in finding server leagues", sleagues.statusCode );

  sleagues = JSON.parse( sleagues.body );

  let sleague = sleagues.find( sl => sl.league === leaguename && sl.season === season );

  // remove server league, if preexisting
  if( sleague ) {
    let remleague = yield request( {
      url : server + `/v1/league/${sleague._id}`,
      method : "DELETE",
      headers : { authorization : authorization }
    });

    if( remleague.statusCode > 299 )
      throw new Error( "err in removing league", remleague.statusCode );
  }

  // create server league
  sleague = yield request( {
    url : server + '/v1/league',
    method : "POST",
    json : { name : fdleague.caption, league : fdleague.league, season : +fdleague.year },
    headers : { authorization : authorization }
  });

  if( sleague.statusCode > 299 )
    throw new Error( "err in creating league", sleague.statusCode );

  return sleague.body;
}

function * getLeague( leaguename, season ) {
  let allleagues = yield request( {
  	url: fdserver + `/v1/soccerseasons?season=${season}`,
    headers : { 'X-Auth-Token' : fdapikey }
  } );

  if( allleagues.statusCode > 299 )
    throw new Error( "err in finding league", allleagues.statusCode );

  allleagues = JSON.parse( allleagues.body );
  let league = allleagues.find( l => l.league === leaguename );
  if( !league )
    throw new Error( "couldnt find league for the given name", 400 );

  return league;
}
