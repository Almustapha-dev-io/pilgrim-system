const Joi = require('joi');
const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50,
        trim: true,
        unique: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

const State = mongoose.model('State', stateSchema);

function validateState (state) {
    const schema = {
        name: Joi.string().min(3).max(50).required(),
    };

    return Joi.validate(state, schema);
}

function validateStateForUpdate (state) {
    const schema = {
        name: Joi.string().min(3).max(50),
    };

    return Joi.validate(state, schema);
}

exports.State = State;
exports.validate = validateState;
exports.validateStateForUpdate = validateStateForUpdate;
exports.stateSchema = stateSchema;