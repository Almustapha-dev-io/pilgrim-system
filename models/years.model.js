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
    }
});

const Year = mongoose.model('Year', yearSchema);

exports.Year = Year;
