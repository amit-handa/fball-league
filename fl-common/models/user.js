'use strict';
let bcrypt = require('..').utils.bcrypt_thunk, // version that supports yields
  constants = require('..').utils.constants,
	l = require('../utils/logger').root.child({'module': __filename.substring(__dirname.length + 1, __filename.length - 3)}),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

let UserSchema = new Schema({
		name: { type : String, required : true },
		password: { type: String, required: true },
		phone : { type : String, required : true, index : true, unique : true },
		leagues : [ { type : Schema.Types.ObjectId, ref : 'League' } ],
		roles : [ { type : String, enum : constants.roles } ],
		modified : { type : Date, required : true, default : Date.now }
	},
	{
		toJSON: {
			transform: function (doc, ret) {
				delete ret.__v;
				delete ret.password;
			}
		}
	});

UserSchema.methods.comparePassword = function * (candidatePassword) {
	return yield bcrypt.compare(candidatePassword, this.password);
};

UserSchema.statics.passwordMatches = function * ( userId, password ) {
	l.debug('userId is: ', userId);

	let query = {'phone': userId};

	let user = yield this.findOne(query).exec();

	if (!user)
		return { err : "User not found", user : null };

	if (yield user.comparePassword(password))
		return { err : null, user : user };

	return { err : "Incorrect password", user : null };
};

mongoose.model('User', UserSchema);
