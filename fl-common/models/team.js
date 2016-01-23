"use strict";

let mongoose = require('mongoose'),
	l = require('../utils/logger').root.child({'module': __filename.substring(__dirname.length + 1, __filename.length - 3)}),
	Schema = mongoose.Schema;

let TeamSchema = new Schema( {
	name : { type : String, required : true },
	nickName : { type : String, required : true },
	site : { type : String, required : true },
	players : [ { type : Schema.Types.ObjectId, ref : 'Player', required : true } ],

	league : { type : Schema.Types.ObjectId, ref : 'League', required : true },

	modified : { type : Date, required : true, default : Date.now }
}, {
	toJSON: {
		transform: function (doc, ret, options) {
			delete ret.__v;
		}
	}
});

TeamSchema.index( { league : 1, nickName : 1 }, { unique : true } );

TeamSchema.pre('remove', function (done) {
	let Game = mongoose.model('Game');
	l.debug('Removing games for team ', this._id);
	let ctx = this;
	Promise.all(
		[ Game.find( { $or : [ {homeTeamId: ctx._id}, { awayTeamId : ctx._id } ] }, (err, games) => {
			if (err) return Promise.reject(err);
			return games.map(game => {
				return new Promise((resolve, reject) => {
					game.remove((err, doc) => {
						if (err) return reject(err);
						return resolve(doc);
					});
				});
			});
		}) ]).then(function (values) {
			l.debug('team delete result: %j', values);
			done(null, values);
		}).catch(function (reason) {
			l.error('Feed delete error: ', reason);
			done(reason);
		});
});

mongoose.model('Team', TeamSchema );
