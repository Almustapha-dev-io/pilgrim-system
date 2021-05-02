const Joi = require('joi');
const mongoose = require('mongoose');

const pilgrimSchema = new mongoose.Schema({

    enrollmentDetails: {
        code: {
            type: String,
            // required: true,
            // unique: true,
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
            type: Number,
            // required: true
        }
    },

    personalDetails: {
        surname: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 24,
            lowercase: true
        },
        otherNames: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 150,
            lowercase: true
        },
        sex: {
            type: String,
            required: true,
            minlength: 4,
            maxlength: 6,
            enum: ['male', 'female'],
            lowercase: true
        },
        maritalStatus: {
            type: String,
            default: 'single',
            minlength: 6,
            maxlength: 12,
            enum: ['single', 'married', 'divorced', 'widow', 'widower'],
            lowercase: true
        },
        homeAddress: {
            type: String,
            required: true,
            minlength: 5,
            maxlength: 50,
            lowercase: true
        },
        stateOfOrigin: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'State'
        },
        localGovOfOrigin: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Lga'
        },
        dateOfBirth: {
            type: Date,
            required: true
        },
        phone: {
            type: String,
            minlength: 11,
            maxlength: 11,
            required: true
        },
        alternatePhone: {
            type: String
        },
    },

    officeDetails: {
        occupation: {
            type: String,
            required: true,
            minlength: 3,
            maxlength: 50,
            lowercase: true
        },
        placeOfWork: {
            type: String,
            required: true,
            minlength: 3,
            maxlength: 50,
            lowercase: true
        },
        officeAddress: {
            type: String,
            required: true,
            minlength: 3,
            maxlength: 50,
            lowercase: true
        },
        profession: {
            type: String,
            required: true,
            minlength: 3,
            maxlength: 50,
            lowercase: true
        }
    },

    nextOfKinDetails: {
        fullName: {
            type: String,
            minlength: 5,
            maxlength: 50,
            required: true,
            lowercase: true
        },
        relationship: {
            type: String,
            enum: ['mother', 'father', 'sibling', 'grand parent', 'uncle', 
                    'aunt', 'cousin', 'niece', 'nephew', 'child', 'spouse'],
            required: true,
            lowercase: true
        },
        address: {
            type: String,
            required: true,
            lowercase: true,
            minlength: 5,
            maxlength: 50
        },
        phone: {
            type: String,
            minlength: 11,
            maxlength: 11,
            required: true
        }
    },

    passportDetails: {
        passportType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ['normal', 'official', 'diplomatic']
        },
        passportNumber: {
            type: String,
            required: true
        },
        placeOfIssue: {
            type: String,
            required: true,
        },
        dateOfIssue: {
            type: Date,
            required: true
        },
        expiryDate: {
            type: Date,
            required: true
        }
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
            unique: true,
            lowercase: true
        },
        receiptNumber:  {
            type: String,
            required: true,
            unique: true,
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

    attachedDocuments: {
        guarantorFormUrl: {
            type: String,
            required: true,
            unique: true
        },
        passportUrl: {
            type: String,
            required: true,
            unique: true
        },
        mouUrl: {
            type: String,
            required: true,
            unique: true
        }
    },
    deleted: {
        type: Boolean,
        default: false    
    },
    dateCreated: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const Pilgrim = mongoose.model('Pilgrim', pilgrimSchema);

function validatePilgrim(pilgrim) {
    const schema = {
 
        enrollmentDetails: Joi.object({
            hajjExperience: Joi.string().min(4).max(50).required(),
            lastHajjYear: Joi.string().min(4).max(4).required(),
            enrollmentZone: Joi.objectId().required(),
            enrollmentAllocationNumber: Joi.number().greater(0).required(),
            enrollmentYear: Joi.number().integer().required()
        }).required(),

 
        personalDetails: Joi.object({
            surname: Joi.string().min(2).max(24).required(),
            otherNames: Joi.string().min(2).max(150).required(),
            sex: Joi.string().min(4).max(6).required(),
            maritalStatus: Joi.string().min(6).max(12).required(),
            homeAddress: Joi.string().min(5).max(50).required(),
            stateOfOrigin: Joi.objectId().required(),
            localGovOfOrigin: Joi.objectId().required(),
            dateOfBirth: Joi.date().required(),
            phone: Joi.string().min(11).max(11).required(),
            alternatePhone: Joi.string().min(11).max(11).allow(null, '')
        }).required(),

 
        officeDetails: Joi.object({
            occupation: Joi.string().min(3).max(50).required(),
            placeOfWork: Joi.string().min(3).max(50).required(),
            officeAddress: Joi.string().min(3).max(50).required(),
            profession: Joi.string().min(3).max(50).required()
        }).required(),

 
        nextOfKinDetails: Joi.object({
            fullName: Joi.string().min(5).max(50).required(),
            address: Joi.string().min(5).max(50).required(),
            phone: Joi.string().min(11).max(11).required(),
            relationship: Joi.string().required()
        }).required(),

 
        passportDetails: Joi.object({
            passportType: Joi.string().required(),
            passportNumber: Joi.string().required(),
            placeOfIssue: Joi.string().required(),
            dateOfIssue: Joi.date().required(),
            expiryDate: Joi.date().required()
        }).required(),

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

 
        attachedDocuments: Joi.object({
            guarantorFormUrl: Joi.string().required(),
            passportUrl: Joi.string().required(),
            mouUrl: Joi.string().required()
        }).required()        
    }

    return Joi.validate(pilgrim, schema);
}

function validatePilgrimForUpdate(pilgrim) {
    const schema = {
        enrollmentDetails: Joi.object({
            hajjExperience: Joi.string().min(4).max(50),
            lastHajjYear: Joi.string().min(4).max(4),
            enrollmentZone: Joi.objectId(),
            enrollmentAllocationNumber: Joi.number().greater(0),
            enrollmentYear: Joi.number().integer()
        }),

        personalDetails: Joi.object({
            surname: Joi.string().min(2).max(24),
            otherNames: Joi.string().min(2).max(150),
            sex: Joi.string().min(4).max(6),
            maritalStatus: Joi.string().min(6).max(12),
            homeAddress: Joi.string().min(5).max(50),
            stateOfOrigin: Joi.objectId(),
            localGovOfOrigin: Joi.objectId(),
            dateOfBirth: Joi.date(),
            phone: Joi.string().min(11).max(11),
            alternatePhone: Joi.string().min(11).max(11).allow(null, '')
        }),

        officeDetails: Joi.object({
            occupation: Joi.string().min(3).max(50),
            placeOfWork: Joi.string().min(3).max(50),
            officeAddress: Joi.string().min(3).max(50),
            profession: Joi.string().min(3).max(50)
        }),

        nextOfKinDetails: Joi.object({
            fullName: Joi.string().min(5).max(50),
            address: Joi.string().min(5).max(50),
            phone: Joi.string().min(11).max(11),
            relationship: Joi.string()
        }),

        passportDetails: Joi.object({
            passportType: Joi.string(),
            passportNumber: Joi.string(),
            placeOfIssue: Joi.string(),
            dateOfIssue: Joi.date(),
            expiryDate: Joi.date()
        }),

        paymentHistory: Joi.array().items(Joi.object({
            bank: Joi.objectId().required(),
            tellerNumber: Joi.string().required(),
            receiptNumber: Joi.string().required(),
            paymentDate: Joi.date().required(),
            amount: Joi.number().required(),
        }))
        .unique((a, b) => a.tellerNumber === b.tellerNumber)
        .unique((a, b) => a.receiptNumber === b.receiptNumber),

        attachedDocuments: Joi.object({
            guarantorFormUrl: Joi.string(),
            passportUrl: Joi.string(),
            mouUrl: Joi.string()
        }),
        
        deleted: Joi.boolean()
    }

    return Joi.validate(pilgrim, schema);
}


exports.Pilgrim = Pilgrim;
exports.validate = validatePilgrim;
exports.validateForUpdate = validatePilgrimForUpdate;