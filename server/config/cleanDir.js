"use strict";

let co = require( 'co' ),
  fs = require( 'co-fs' );

/*  opts.path
    opts.obsMins
    opts.log
*/

module.exports = function cleanDir( opts ) {
  return co.wrap( function *() {
    let files = yield fs.readdir( opts.path );

    opts.log.debug( files );
    let ctime = new Date().getTime();
    for( let i = 0; i < files.length; i++ ) {
    	let f = files[i];
    	let fstat = yield fs.stat( opts.path + '/' + f );
    	if( !fstat.isFile() )
    	  continue;

    	let dur = (ctime-fstat.atime.getTime())/60000;
      if( dur > opts.obsMins ) {
      	opts.log.debug( "file ", f, fstat, dur );
        yield fs.unlink( opts.path + '/' + f );
      }
    }
  } );
};

if( !module.parent ) {
  var b = require( 'bunyan' );
  let l = b.createLogger( { name : 'rlog', streams : [ { stream: process.stdout } ] } );
  let cleanDir = module.exports( { path : './uploads', obsMins : 1, log : l });
  cleanDir();
}
