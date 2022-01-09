const Joi = require('joi');
const mongoose = require('mongoose');

const pilgrimSchema = new mongoose.Schema({
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
            required: true,
            unique: true
        },
        email: {
            type: String,
            unique: true,
            lowercase: true
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

    mahrimDetails: {
        fullName: {
            type: String,
            minlength: 5,
            maxlength: 50,
            lowercase: true
        },
        relationship: {
            type: String,
            enum: ['mother', 'father', 'sibling', 'grand parent', 'uncle', 
            'aunt', 'cousin', 'niece', 'nephew', 'child', 'spouse'],
            lowercase: true
        },
        address: {
            type: String,
            lowercase: true,
            minlength: 5,
            maxlength: 50
        },
        phone: {
            type: String,
            minlength: 11,
            maxlength: 11,
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
            unique: true,
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
        },
        otherDocuments: [{
            documentName: String,
            docUrl: String
        }]
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
        personalDetails: Joi.object({
            surname: Joi.string().min(2).max(24).required(),
            otherNames: Joi.string().min(2).max(150).required(),
            sex: Joi.string().min(4).max(6).required(),
            maritalStatus: Joi.string().max(12).required(),
            homeAddress: Joi.string().min(5).max(50).required(),
            stateOfOrigin: Joi.objectId().required(),
            localGovOfOrigin: Joi.objectId().required(),
            dateOfBirth: Joi.date().required(),
            phone: Joi.string().min(11).max(11).required(),
            email: Joi.string().email(),
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
       
        mahrimDetails: Joi.object({
            fullName: Joi.string().min(5).max(50),
            address: Joi.string().min(5).max(50),
            phone: Joi.string().min(11).max(11),
            relationship: Joi.string()
        }).allow(null),

 
        passportDetails: Joi.object({
            passportType: Joi.string().required(),
            passportNumber: Joi.string().required(),
            placeOfIssue: Joi.string().required(),
            dateOfIssue: Joi.date().required(),
            expiryDate: Joi.date().required()
        }).required(),

        attachedDocuments: Joi.object({
            guarantorFormUrl: Joi.string().required(),
            passportUrl: Joi.string().required(),
            mouUrl: Joi.string().required(),
            otherDocuments: Joi.array().items(Joi.object({
                documentName: Joi.string(),
                docUrl: Joi.string()
            }))
        }).required()        
    }

    return Joi.validate(pilgrim, schema);
}

function validatePilgrimForUpdate(pilgrim) {
    const schema = {
        personalDetails: Joi.object({
            surname: Joi.string().min(2).max(24),
            otherNames: Joi.string().min(2).max(150),
            sex: Joi.string().min(4).max(6),
            maritalStatus: Joi.string().max(12),
            homeAddress: Joi.string().min(5).max(50),
            stateOfOrigin: Joi.objectId(),
            localGovOfOrigin: Joi.objectId(),
            dateOfBirth: Joi.date(),
            phone: Joi.string().min(11).max(11),
            email: Joi.string().email(),
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
        
        mahrimDetails: Joi.object({
            fullName: Joi.string().min(5).max(50),
            address: Joi.string().min(5).max(50),
            phone: Joi.string().min(11).max(11),
            relationship: Joi.string()
        }).allow(null),

        passportDetails: Joi.object({
            passportType: Joi.string(),
            passportNumber: Joi.string(),
            placeOfIssue: Joi.string(),
            dateOfIssue: Joi.date(),
            expiryDate: Joi.date()
        }),

        attachedDocuments: Joi.object({
            guarantorFormUrl: Joi.string(),
            passportUrl: Joi.string(),
            mouUrl: Joi.string(),
            otherDocuments: Joi.array().items(Joi.object({
                documentName: Joi.string(),
                docUrl: Joi.string()
            }))
        })  
    }

    return Joi.validate(pilgrim, schema);
}


exports.Pilgrim = Pilgrim;
exports.validate = validatePilgrim;
exports.validateForUpdate = validatePilgrimForUpdate;