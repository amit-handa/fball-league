'use strict';
var mongodb = require('mongodb'),
	sdcommon = require('..'),
	l = require('./logger').root.child({'module': __filename.substring(__dirname.length + 1, __filename.length - 3)}),
	sizeOf = require('image-size'),
	utils = require( '../utils/util' ),
	gm = require( 'gm' );

var logmeta = {};

exports.getDB = getDB;
exports.cropImgCmd = cropImgCmd;

exports.resizeImg = resizeImg;
exports.cropImage = cropImage;
exports.saveToGrid = saveToGrid;
exports.remFromGrid = remFromGrid;
exports.deleteImage = deleteImage;
exports.deleteAllFiles = deleteAllFiles;

// file/buffer
function * cropImage(imgpath, tosize) {
	// get curr size of img
	var imgsize = sizeOf( imgpath );

	var cropcmd = cropImgCmd({w: imgsize.width, h: imgsize.height}, tosize);
	return yield new Promise((resolve, reject) => {
		gm(imgpath)
			.crop(cropcmd.w, cropcmd.h, cropcmd.x, cropcmd.y)
			.toBuffer((err, res) => {
				if(err)
					reject(err);
				resolve(res);
			});
	});
}

function * resizeImg(imgpath, tosize) {
	return yield new Promise((resolve, reject) => {
		gm(imgpath)
			.resize(tosize.w, tosize.h, '^')
			.gravity('Center')
			.crop( tosize.w, tosize.h )
			.toBuffer((err, res) => {
				var dim = sizeOf(res);
				l.info('Resulting Dimensions: W: %d, H: %d', dim.width, dim.height, logmeta);
				if(err)
					reject(err);
				resolve(res);
			});
	});
}

function * deleteImage(pid, ofilename) {
	var db = yield getDB();
	l.info('delete image %s %s', pid, ofilename, logmeta);
	var files = db.collection(`${mongodb.GridStore.DEFAULT_ROOT_COLLECTION}.files`);
	var docs = yield new Promise((resolve, reject) => {
		files.find({metadata: {pid: pid, ofilename: ofilename}}).toArray((err, docs) => {
			if(err )
				reject(err);
			resolve(docs);
		});
	});
	yield docs.map(val => {
		return remFromGrid(val._id);
	});
}

function * deleteAllFiles() {
	var db = yield getDB();
	l.info('Delete all files from grid store...');
	var coll = db.collection(`${mongodb.GridStore.DEFAULT_ROOT_COLLECTION}.files`);
	var files = yield new Promise((resolve, reject) => {
		coll.find({}).toArray((err, res) => {
			if (err) reject(err);
			resolve(res);
		});
	});

	yield files.map(file => {
		return remFromGrid(file._id);
	});
}

function * remFromGrid(filename) {
	// delete earlier file is exists
	var db = yield getDB();
	l.info('removing from grid %s', filename, logmeta);
	try {
		yield new Promise((resolve, reject) => {
			mongodb.GridStore.unlink(db, filename, (err, res) => {
				if(err)
					reject(err);
				resolve(res);
			});
		});
	} catch (err) {
		l.error("err in removing %s, %j", filename, err, logmeta);
	}
}

/*
 opts.metadata : data to embed into the fs.files doc
 */
function * saveToGrid(data, filename, opts) {
	var db = yield getDB();
	var objId = new mongodb.ObjectID();
	l.info('Details of save to grid params', objId, filename, opts);
	var gfile = new mongodb.GridStore(db, objId, filename, 'w', opts);

	try {
		yield gfile.open();
		if( data.file )
			yield gfile.writeFile( data.file );
		else yield gfile.write( data.data );
		yield gfile.close();
	} catch( err ) {
		l.error( "err in saving to grid ", err );
	}
}

var db;
function * getDB() {
	if (db) return Promise.resolve(db);
	let dburl = utils.makeMongoUrl( sdcommon.config.mongo.dbhost, sdcommon.config.mongo.dbname, sdcommon.config.mongo.user, sdcommon.config.mongo.password );
	return yield new Promise((r, j) => {
		mongodb.MongoClient.connect( dburl, (err, res) => {
			if (err) j(err);

			db = res;
			initGridStore(db)
				.then(() => {
					r(db);
				})
				.catch((err) => {
					l.error('err while creating gridstore file unique index', logmeta);
					r(db);
				});
		});
	});
}

function initGridStore(db) {
	var gs = new mongodb.GridStore(db, null, 'w');
	var filesc = gs.collection();
	return new Promise((resolve, reject) => {
		filesc.createIndex({filename: 1}, {unique: true}, (err, res) => {
			if(err)
				reject(err);
			resolve(res);
		});
	});
}

/*
 * @param : fsize : { w :, h: }
 * tsize : { w: , h: }
 * @output : crop-cmd : { w: , h: , x: , y: }
 */
function cropImgCmd(fsize, tsize) {
	var toaspect = tsize.h / tsize.w;

	var w, h;
	w = fsize.w > tsize.w ? tsize.w : fsize.w;
	h = toaspect * w;
	if (h > fsize.h) {
		h = fsize.h;
		w = h / toaspect;
	}

	var x = fsize.w / 2 - w / 2, y = fsize.h / 2 - h / 2;
	return {w: w, h: h, x: x, y: y};
}
