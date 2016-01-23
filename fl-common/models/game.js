"use strict";

let mongoose = require('mongoose'),
	Schema = mongoose.Schema;

let GameSchema = new Schema({
	league : { type : Schema.Types.ObjectId, ref : 'League', index : true, required : true },

	date : { type : Date, required : true },

	homeTeamId : { type : Schema.Types.ObjectId, ref : 'Team', index : true, required : true },
	homeTeamName : { type : String, required : true },

	awayTeamId : { type : Schema.Types.ObjectId, ref : 'Team', index : true, required : true },
	awayTeamName : { type : String, required : true },

	homeTeamGoals : { type : Number, required : true, default : -2 },
	awayTeamGoals : { type : Number, required : true, default : -2 },

	modified : { type : Date, required : true, default : Date.now }
}, {
	toJSON: {
		transform: function (doc, ret, options) {
			delete ret.__v;
		}
	}
});

mongoose.model('Game', GameSchema );
