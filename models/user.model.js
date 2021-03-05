const config = require('config');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const mongoose = require('mongoose')
const _ = require('lodash');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        minlength: 5,
        maxlength: 50,
        required: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        minlength: 5,
        maxlength: 50,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        minlength: 5,
        maxlength: 1023,
        required: true
    },
    localGovernment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LocalGovernment',
        required: true
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign( _.pick(this, ['_id', 'name', 'email', 'localGovernment', 'role']),
        config.get('jwtPrivateKey'));
    return token;
};

const User = mongoose.model('User', userSchema);

function validateUser (user) {
    const schema = {
        name: Joi.string().min(5).max(50).required(),
        roleId: Joi.objectId(),
        localGovernmentId: Joi.objectId(),
        email: Joi.string().min(5).max(50).email().required(),
    };

    return Joi.validate(user, schema);
}

function validateUserForUpdate (user) {
    const schema = {
        name: Joi.string().min(5).max(50),
        email: Joi.string().min(5).max(50).email(),
        password: Joi.string().min(5).max(1023),
        roleId: Joi.objectId(),
        localGovernmentId: Joi.objectId(),
    };

    return Joi.validate(user, schema);
}

exports.User = User;
exports.validate = validateUser;
exports.validateForUpdate = validateUserForUpdate;  