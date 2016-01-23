'use strict';
let flcommon = require('..'),
	l = require('../utils/logger').root.child({'module': __filename.substring(__dirname.length + 1, __filename.length - 3)}),
	Constants = require('../utils/constants'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

let PlayerSchema = new Schema({
	name: {type: String, required: true},
	gender: {type: String, required: true, enum: Constants.GENDERS},
	nationality : { type : String, enum : Constants.Countries },
	dob: {type: Date, required : true},
	contractEnd : { type : Date }
}, {
	toJSON: {
		transform: function (doc, ret) {
			delete ret.__v;
		}
	}
});

mongoose.model('Player', PlayerSchema);
