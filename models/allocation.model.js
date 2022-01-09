const mongoose = require('mongoose');
const Joi = require('joi');

const allocationSchema = new mongoose.Schema({
    pilgrim: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pilgrim',
        required: true
    },
    migrated: {
        type: Boolean,
        default: false
    },
    code: {
        type: String,
        unique: true,
        minlength: 12,
        uppercase: true
    },
    hajjExperience: {
        type: String,
        required: true,
        minlength: 4,
        maxlength: 50,
        lowercase: true
    },
    lastHajjYear: {
        type: String,
        required: true,
        minlength: 4,
        maxlength: 4,
        default: '0000'
    },
    enrollmentZone: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'LocalGovernment'
    },
    enrollmentYear: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Year'
    },
    enrollmentAllocationNumber: {
        type: Number
    },
    paymentHistory: [{
        bank: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Bank'
        },
        tellerNumber: {
            type: String,
            required: true,
            lowercase: true
        },
        receiptNumber:  {
            type: String,
            required: true,
            lowercase: true
        },
        paymentDate: {
            type: Date,
            required: true
        },
        amount: {
            type: Number,
            required: true
        }
    }],
    deleted: {
        type: Boolean,
        default: false    
    },
    deletionReason: String,
    fundRefunded: String,
    amountRefunded: Number,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
}, { timestamps: true });


allocationSchema.statics.generateCode = function(allocationNumber, year, zoneCode) {
    let zeros = '';
    if (allocationNumber < 10) {
        zeros = '000';
    } else if (allocationNumber >= 10 && allocationNumber < 100) {
        zeros = '00';
    } else if (allocationNumber >= 100 && allocationNumber < 1000) {
        zeros = '0';
    }
    return ('KD' + zeros + allocationNumber + zoneCode + '-' + year).toUpperCase();
};

const Allocation = mongoose.model('Allocation', allocationSchema);

function validateAllocation(allocation) {
    const schema = {
        pilgrim: Joi.objectId().required(),
        hajjExperience: Joi.string().min(4).max(50).required(),
        lastHajjYear: Joi.string().min(4).max(4).required(),
        enrollmentZone: Joi.objectId().required(),
        enrollmentAllocationNumber: Joi.number().greater(0).required(),
        enrollmentYear: Joi.objectId().required(),
        paymentHistory: Joi.array().items(Joi.object({
            bank: Joi.objectId().required(),
            tellerNumber: Joi.string().required(),
            receiptNumber: Joi.string().required(),
            paymentDate: Joi.date().required(),
            amount: Joi.number().required()
        }))
        .unique((a, b) => a.tellerNumber === b.tellerNumber)
        .unique((a, b) => a.receiptNumber === b.receiptNumber)
        .required(),
    }

    return Joi.validate(allocation, schema);
}

function validateAllocationForUpdate(allocation) {
    const schema = {
        pilgrim: Joi.objectId(),
        migrated: Joi.boolean(),
        hajjExperience: Joi.string().min(4).max(50),
        lastHajjYear: Joi.string().min(4).max(4),
        enrollmentZone: Joi.objectId(),
        enrollmentAllocationNumber: Joi.number().greater(0),
        enrollmentYear: Joi.objectId(),
        paymentHistory: Joi.array().items(Joi.object({
            bank: Joi.objectId(),
            tellerNumber: Joi.string(),
            receiptNumber: Joi.string(),
            paymentDate: Joi.date(),
            amount: Joi.number()
        }))
            .unique((a, b) => a.tellerNumber === b.tellerNumber)
            .unique((a, b) => a.receiptNumber === b.receiptNumber),
        deleted: Joi.boolean(),
        deletionReason: Joi.string(),
        fundRefunded: Joi.string(),
        amountRefunded: Joi.number()
    }

    return Joi.validate(allocation, schema);
}

exports.Allocation = Allocation;
exports.validate = validateAllocation;
exports.validateForUpdate = validateAllocationForUpdate;
