const Joi = require('joi');
const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255,
        trim: true,
        unique: true,
    },
    active: {
        type: Boolean,
        default: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

const Bank = mongoose.model('Bank', bankSchema);

function validateBank (bank) {
    const schema = {
        name: Joi.string().min(5).max(255).required()
    };

    return Joi.validate(bank, schema);
}

function validateBankForUpdate (bank) {
    const schema = {
        name: Joi.string().min(5).max(255),
        active: Joi.boolean()
    }

    return Joi.validate(bank, schema);
}

exports.Bank = Bank;
exports.validate = validateBank;
exports.validateForUpdate = validateBankForUpdate;
exports.bankSchema = bankSchema;