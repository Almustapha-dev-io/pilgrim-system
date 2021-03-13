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

exports.Bank = Bank;
exports.validate = validateBank;
exports.bankSchema = bankSchema;