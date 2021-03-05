const Joi = require('joi');
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255,
        lowercase: true,
        trim: true,
        unique: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

const Role = mongoose.model('Role', roleSchema);

function validateRole (role) {
    const schema = {
        name: Joi.string().min(5).max(255).required()
    };

    return Joi.validate(role, schema);
}

exports.Role = Role;
exports.validate = validateRole;
exports.roleSchema = roleSchema;