'use strict';

let fs = require( 'co-fs' ),
	csvparse = require( 'csv-parse' ),
	flcommon = require( '..' );

exports.pad = pad;
exports.pickInt = pickInt;
exports.makeMongoUrl = makeMongoUrl;
exports.findTransitiveField = findTransitiveField;
exports.readCSV = readCSV;
exports.verifyPin = verifyPin;
exports.isEmail = isEmail;
exports.isPhone = isPhone;
exports.isAdmin = isAdmin;

function * isAdmin( next ) {
	let user = this.passport.user;

	if( user.roles.find( r => r === 'admin' ) )
		yield next;
	else {
		this.status = 400;
		this.body = 'non-admin cant update league';
	}
}

let emailtype = new RegExp(/^.*@.*\..*$/);
function isEmail(val) {
    return emailtype.test(val);
}

let numtype = new RegExp(/^\d+$/);
function isPhone(val) {
    if (val.length === 10 && numtype.test(val))
        return true;
    return false;
}

function* verifyPin(id, pin) {
  if (pin === '92111')
    return true;
  return false;
}

function * readCSV( csvfile ) {
  let bufdata = yield fs.readFile( csvfile );
  let csvrows = yield new Promise( (res, rej) => {
    csvparse( bufdata, {}, ( err, rows ) => {
      if( err ) rej( err );
      res( rows );
    } );
  } );

  let cols = csvrows.shift();
	return { rows : csvrows, cols : cols };
}

function findTransitiveField( r, c ) {
	if( r[c] )
	  return r[c];

	let fields = c.split( '.' );
	let v = r;
	for( let i = 0; i < fields.length; i++ ) {
	  v = v[fields[i]];
	}
	return v;
}

function makeMongoUrl( dbhost, db, user, password ) {
	let url = 'mongodb://';
	if( user && password && flcommon.config.app.env !== 'dev'){
		url += user + ':' + encodeURIComponent( password ) + `@${dbhost}:27017/${db}?authSource=admin`;
		console.log('Mongo url: %s with cred', url);
	}
	else{
		url += `${dbhost}:27017/${db}`;
		console.log('Mongo url: %s', url);
	}
	return url;
}

function pad(num, size) {
  return ('000000000' + num).substr(-size);
}

function pickInt( range ) {
  let num = Math.random()*range;
  let i = Math.round( num );
  //console.log( "pickint ", i, num );
  return i;
}
