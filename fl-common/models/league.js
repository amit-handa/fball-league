"use strict";

let mongoose = require('mongoose'),
	l = require('../utils/logger').root.child({'module': __filename.substring(__dirname.length + 1, __filename.length - 3)}),
	Schema = mongoose.Schema;

let LeagueSchema = new Schema( {
	name : { type : String, required : true },
	league : { type : String, required : true },
	season : { type : Number, required : true },
	modified : { type : Date, required : true, default : Date.now }
}, {
	toJSON: {
		transform: function (doc, ret, options) {
			delete ret.__v;
		}
	}
});

LeagueSchema.index( { league : 1, season : -1 }, { unique : true });
LeagueSchema.pre('remove', function (done) {
	let Games = mongoose.model('Game');
	let Teams = mongoose.model('Team');
	l.debug('Removing games and teams for league: ', this._id);
	let ctx = this;
	Promise.all(
		[
			Games.find({league: ctx._id}, (err, games) => {
				if (err) return Promise.reject(err);
				return games.map(game => {
					return new Promise((resolve, reject) => {
						game.remove((err, doc) => {
							if (err) return reject(err);
							return resolve(doc);
						});
					});
				});
			}),
			Teams.find({league: ctx._id}, (err, teams) => {
				if (err) return Promise.reject(err);
				return teams.map(team => {
					return new Promise((resolve, reject) => {
						team.remove((err, doc) => {
							if (err) return reject(err);
							return resolve(doc);
						});
					});
				});
			})
		]).then(function (values) {
			l.debug('League delete result: %j', values);
			done(null, values);
		}).catch(function (reason) {
			l.error('Feed delete error: ', reason);
			done(reason);
		});
});

mongoose.model('League', LeagueSchema );
