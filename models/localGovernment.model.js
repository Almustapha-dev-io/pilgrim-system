const Joi = require('joi');
const mongoose = require('mongoose');

const localGovernmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 255,
        uppercase: true,
        trim: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 3,
        lowercase: true,
        trim: true,
        unique: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

const LocalGovernment = mongoose.model('LocalGovernment', localGovernmentSchema);

function validateLocalGovernment (localGovernment) {
    const schema = {
        name: Joi.string().min(3).max(255).required(),
        code: Joi.string().min(2).max(3).required()
    };

    return Joi.validate(localGovernment, schema);
}

function validateLocalGovernmentForUpdate (localGovernment) {
    const schema = {
        name: Joi.string().min(3).max(255),
        code: Joi.string().min(2).max(3)
    };

    return Joi.validate(localGovernment, schema);
}

exports.LocalGovernment = LocalGovernment;
exports.validate = validateLocalGovernment;
exports.validateForUpdate = validateLocalGovernmentForUpdate;
