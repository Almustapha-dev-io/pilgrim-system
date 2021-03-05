const Joi = require('joi');
const mongoose = require('mongoose');

const lgaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 50,
        lowercase: true,
        trim: true,
    },
    state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'State',
        required: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

const Lga = mongoose.model('Lga', lgaSchema);

function  validateLga (lga) {
    const schema = {
        name: Joi.string().min(2).max(50).required(),
        stateId: Joi.objectId().required()
    }
    return Joi.validate(lga, schema);
}

function  validateLgaForUpdate (Lga) {
    const schema = {
        name: Joi.string().min(2).max(50),
        stateId: Joi.objectId()
    }
    return Joi.validate(Lga, schema);
}

exports.Lga = Lga;
exports.validate = validateLga;
exports.validateForUpdate = validateLgaForUpdate;