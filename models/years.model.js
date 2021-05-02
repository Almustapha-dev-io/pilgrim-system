const Joi = require('joi');
const mongoose = require('mongoose');

const yearSchema = new mongoose.Schema({
    year: {
        type: String,
        required: true,
        minlength: 4,
        maxlength: 4,
        unique: true
    },
    active: {
        type: Boolean,
        default: false
    },
    dateOpened: {
        type: Date,
        default: Date.now
    },
    lastClosed: Date,
    seatAllocations: [{
        zone: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LocalGovernment',
            required: true,
            unique: true
        },
        seatsAllocated: {
            type: Number,
            required: true
        }
    }]
});

const Year = mongoose.model('Year', yearSchema);


function validateYear(year) {
    const schema = {
        year: Joi.string().min(4).max(4).required(),
        active: Joi.boolean(),
        dateOpened: Joi.date().required(),
        lastClosed: Joi.date(),
        seatAllocations: Joi.array().items(
            Joi.object({
                zone: Joi.objectId().required(),
                seatsAllocated: Joi.number().greater(-1).required()
            })).unique().required()
    }

    return Joi.validate(year, schema);
}

function validateYearForUpdate(year) {
    const schema = {
        year: Joi.string(),
        active: Joi.boolean(),
        dateOpened: Joi.date(),
        lastClosed: Joi.date(),
        seatAllocations: Joi.array().items(
            Joi.object({
                zone: Joi.objectId(),
                seatsAllocated: Joi.number().greater(-1)
            })).unique((a, b) => a.zone === b.zone),
        zone: Joi.objectId(),
        seatsAllocated: Joi.number().greater(-1)
    }

    return Joi.validate(year, schema);
}

exports.Year = Year;
exports.validate = validateYear;
exports.validateForUpdate = validateYearForUpdate;