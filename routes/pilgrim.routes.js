const _ = require('lodash');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const { initiator, reviewer, initiator_admin } = require('../middleware/role');
const admin = require('../middleware/admin');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const upload = require('../middleware/multer');

const { Pilgrim, validate, validateForUpdate } = require('../models/pilgrim.model');
const { LocalGovernment } = require('../models/localGovernment.model');
const { State } = require('../models/state.model');
const { Lga } = require('../models/lga.model');
const { Year } = require('../models/years.model');

const pathHelper = require('../util/path');
const imagePath = path.join(pathHelper, '..', 'public', 'images');

const router = express.Router();

// get pilgrim by id
router.get('/by-id/:id', [auth, initiator_admin, validateObjectId], async (req, res) => {
    try {
        const { id: pilgrimId } = req.params;

        const pilgrim = await Pilgrim
            .findOne({ _id: pilgrimId, 'enrollmentDetails.enrollmentZone': req.userLga })
                .populate('enrollmentDetails.enrollmentZone', '_id name code')
                .populate('personalDetails.stateOfOrigin', '_id name')
                .populate('personalDetails.localGovOfOrigin', '_id name')
                .populate('createdBy', '_id name')
                .sort('-dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code');
        if (!pilgrim) return res.status(404).send('Pilgrim with the given id has not been registered in your zone.');

        return res.send(pilgrim);
    } catch (err) {
        throw(err);
    }
});

// get pilgrim by code
router.get('/by-code/:code', [auth, initiator_admin, validateObjectId], async (req, res) => {
    try {
        const { code: pilgrimCode } = req.params;

        const pilgrim = await Pilgrim
            .findOne({ 'enrollmentDetails.code': pilgrimCode, 'enrollmentDetails.enrollmentZone': req.userLga })
                .populate('enrollmentDetails.enrollmentZone', '_id name code')
                .populate('personalDetails.stateOfOrigin', '_id name')
                .populate('personalDetails.localGovOfOrigin', '_id name')
                .populate('createdBy', '_id name')
                .sort('-dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code');
        if (!pilgrim) return res.status(404).send('Pilgrim with the given number has not been registered in your zone.');

        return res.send(pilgrim);
    } catch (err) {
        throw(err);
    }
});

// get all pilgrims in an lga by initiator /admin
router.get('/by-year/:id', [auth, initiator_admin, validateObjectId], async (req, res) => {
    const yearId = req.params.id;

    const year = await Year.findById(yearId);
    if (!year) return res.status(400).send('Invalid year');

    const pilgrims = await Pilgrim
        .find({ 
            deleted: false, 
            'enrollmentDetails.enrollmentZone': req.userLga, 
            'enrollmentDetails.enrollmentYear': year._id 
        })
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', 'year')
        .sort('enrollmentDetails.enrollmentZone.code');

    return res.send(pilgrims);
});

// create pilgrim initiator
router.post('/', [auth, initiator], async (req, res) => {
    try {
        const { error } = validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        const { enrollmentDetails, personalDetails, officeDetails, nextOfKinDetails, 
                passportDetails, paymentHistory, attachedDocuments } = req.body;
                
        const  userLga = req.userLga;

        const year = await Year.findOne({ active: true });
        if (!year) return res.status(400).send('Hajj registration not opened yet.');

        const localGov = await LocalGovernment.findById(enrollmentDetails.enrollmentZone);
        if (!localGov) return res.status(400).send('Invalid enrollment local gov\'t.');

        if (localGov._id.toString() !== userLga.toString())
            return res.status(400).send('Sorry, you cannot register pilgrims to the selected zone');
        
        const state = await State.findById(personalDetails.stateOfOrigin);
        if (!state) return res.status(400).send('Invalid state of origin.');

        const lgaOfOrigin = await Lga.findById(personalDetails.localGovOfOrigin);
        if (!lgaOfOrigin) return res.status(400).send('Invalid local gov\'t of origin.');
        
        if (lgaOfOrigin.name.trim() === '00') return res.status(400).send('Cannot assign pilgrim to this lga.');

        let pilgrimsCount = await Pilgrim.countDocuments({
            'enrollmentDetails.enrollmentZone': userLga, 
            'enrollmentDetails.enrollmentYear': year._id
        });
        
        const pilgrimNumber =  `KD000${pilgrimsCount + 1}${localGov.code}-${year.year}`.toUpperCase();

        let pilgrim = await Pilgrim.findOne({ 'enrollmentDetails.code': pilgrimNumber });
        if (pilgrim) return res.status(400).send('A pilgrim exists ' + pilgrimNumber);

        const body = {
            enrollmentDetails: {...enrollmentDetails,  code: pilgrimNumber, enrollmentYear: year._id },
            personalDetails: {...personalDetails},
            officeDetails: {...officeDetails},
            nextOfKinDetails: {...nextOfKinDetails},
            passportDetails: {...passportDetails},
            paymentHistory: [...paymentHistory],
            attachedDocuments: {...attachedDocuments},
            createdBy: req.user._id
        };

        pilgrim = new Pilgrim(body);

        pilgrim = await pilgrim.save();

        res.send(pilgrim);
    } catch(err) {
        throw(err);
    }
});

//  update pilgrim admin (lga === pilgrim.lga)
router.put('/:id', [auth, admin, validateObjectId], async (req, res) => {
    try {
        const { error } = validateForUpdate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        let pilgrim = await Pilgrim.findById(req.params.id);
        if (!pilgrim) return res.status(400).send('Invalid pilgrim.');

        if (pilgrim.enrollmentDetails.enrollmentZone.toString() !== req.userLga.toString())
            return res.status(400).send('You cannot edit this pilgrim');

        // let updatedPaymentHistory = [];
        // if (req.body.paymentHistory) {
        //     updatedPaymentHistory =  [...pilgrim.paymentHistory, ...req.body.paymentHistory];
        //     pilgrim.paymentHistory = updatedPaymentHistory;
        // }

        // let updatedEnrollmentDetails = {};
        // if (req.body.enrollmentDetails) {
        //     updatedEnrollmentDetails = { ...req.body.enrollmentDetails };
        //     pilgrim.enrollmentDetails = updatedEnrollmentDetails;
        // }

        // let updatedPersonalDetails = {};
        // if (req.body.personalDetails) {
        //     updatedPersonalDetails = { ...req.body.personalDetails };
        //     pilgrim.personalDetails = updatedPersonalDetails;
        // }

        // let updatedOfficeDetails = { ...req.body.officeDetails };
        // pilgrim.officeDetails = updatedOfficeDetails;

        // let updatedNextOfKinDetails = { ...req.body.nextOfKinDetails };
        // pilgrim.nextOfKinDetails = updatedNextOfKinDetails;

        // let updatedPassportDetails = { ...req.body.passportDetails };
        // pilgrim.passportDetails = updatedPassportDetails;

        // let updatedAttachedDocuments = { ...req.body.attachedDocuments };
        // pilgrim.attachedDocuments = updatedAttachedDocuments;

        // pilgrim = await pilgrim.save();


        pilgrim = await Pilgrim.findByIdAndUpdate(req.params.id, {
            $set: req.body
        }, { new: true, useFindAndModify: false });
        if (!pilgrim) return res.status(404).send('Pilgrim with given ID not found.');
        
        res.send(pilgrim);
    } catch (err) {
        throw(err);
    }
});


//  delete pilgrim admin (lga === pilgrim.lga)
router.put('/delete/:id', [auth, admin, validateObjectId], async (req, res) => {
    let pilgrim = await Pilgrim.findById(req.params.id);
    if (!pilgrim) return res.status(400).send('Invalid pilgrim.');

    if (pilgrim.enrollmentDetails.enrollmentZone.toString() !== req.userLga.toString())
        return res.status(400).send('You cannot delete this pilgrim');

    pilgrim.deleted = true;

    pilgrim = await pilgrim.save();
    res.send(pilgrim);
});

//  restore deleted pilgrim admin (lga === pilgrim.lga)
router.put('/restore/:id', [auth, admin, validateObjectId], async (req, res) => {
    let pilgrim = await Pilgrim.findById(req.params.id);
    if (!pilgrim) return res.status(400).send('Invalid pilgrim.');

    if (pilgrim.enrollmentDetails.enrollmentZone.toString() !== req.userLga.toString())
        return res.status(400).send('You cannot restore this pilgrim');

    pilgrim.deleted = false;

    pilgrim = await pilgrim.save();
    res.send(pilgrim);
});

//  get deleted pilgrims by lga and year
router.get('/deleted-by-year/:id', [auth, admin, validateObjectId], async (req, res) => {
    const yearId = req.params.id;
    
    const year = await Year.findById(yearId);
    if (!year) return res.status(400).send('Invalixd year.');

    const pilgrims = await Pilgrim
        .find({
            deleted: true,
            'enrollmentDetails.enrollmentZone': req.userLga,
            'enrollmentDetails.enrollmentYear': year._id
        })
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', '-_id year')
        .sort('enrollmentDetails.enrollmentZone.code');

    return res.send(pilgrims);
});

// get all pilgrims in an lga 
router.get('/reviewer/by-lga/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    try {
        const { id: lgaId } = req.params;

        const pilgrims = await Pilgrim
            .find({ deleted: false, 'enrollmentDetails.enrollmentZone': lgaId })
            .populate('enrollmentDetails.enrollmentZone', '_id name code')
            .populate('personalDetails.stateOfOrigin', '_id name')
            .populate('personalDetails.localGovOfOrigin', '_id name')
            .populate('createdBy', '_id name')
            .sort('-dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code');

        return res.send(pilgrims);
    } catch (err) {
        throw(err);
    }
});

// get pilgrim by code and lga
router.get('/reviewer/by-code-and-lga/:code/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    try {
        const { code: pilgrimCode, id: lgaId } = req.params;

        const pilgrim = await Pilgrim
            .findOne({ 'enrollmentDetails.code': pilgrimCode, 'enrollmentDetails.enrollmentZone': lgaId })
                .populate('enrollmentDetails.enrollmentZone', '_id name code')
                .populate('personalDetails.stateOfOrigin', '_id name')
                .populate('personalDetails.localGovOfOrigin', '_id name')
                .populate('createdBy', '_id name')
                .sort('-dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code');
        if (!pilgrim) return res.status(404).send('Pilgrim with the given data does not exist.');

        return res.send(pilgrim);
    } catch (err) {
        throw(err);
    }
});

// get all pilgrims reviewer
router.get('/reviewer', [auth, reviewer], async (req, res) => {
    try {
        const pilgrims = await Pilgrim
            .find({ deleted: false })
            .populate('enrollmentDetails.enrollmentZone', '_id name code')
            .populate('personalDetails.stateOfOrigin', '_id name')
            .populate('personalDetails.localGovOfOrigin', '_id name')
            .populate('createdBy', '_id name')
            .sort('-dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code');
    
        return res.send(pilgrims);
    } catch (err) {
        throw(err);
    }    
});


// get all deleted pilgrims
router.get('/reviewer/deleted', [auth, reviewer], async (req, res) => {
    try {
        const pilgrims = await Pilgrim
            .find({ deleted: false })
            .populate('enrollmentDetails.enrollmentZone', '_id name code')
            .populate('personalDetails.stateOfOrigin', '_id name')
            .populate('personalDetails.localGovOfOrigin', '_id name')
            .populate('createdBy', '_id name')
            .populate('enrollmentYear', 'year')
            .sort('-year -dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code');

        return res.send(pilgrims);
    } catch {
        throw(err)
    }
});


// get all pilgrims by year reviewer
router.get('/reviewer/by-year-and-lga/:lga/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    const year = req.params.id;
    const lga = req.params.lga

    if (!mongoose.Types.ObjectId.isValid(lga)) return res.status(400).send('Invalid local government ID.');

    const localGov = await LocalGovernment.findById(lga);
    if (!localGov) return res.status(404).send('Local gov\'t with given ID not found.');

    const pilgrims = await Pilgrim
        .find({ 
            deleted: false, 
            'enrollmentDetails.enrollmentYear': year,
            'enrollmentDetails.enrollmentZone': localGov._id
        })
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', '-_id year')
        .sort('enrollmentDetails.enrollmentZone.code');

    return res.send(pilgrims);
});

// Deleted By year and LGA
router.get('/reviewer/deleted-by-year-and-lga/:lga/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    const year = req.params.id;
    const lga = req.params.lga

    if (!mongoose.Types.ObjectId.isValid(lga)) return res.status(400).send('Invalid local government ID.');

    const localGov = await LocalGovernment.findById(lga);
    if (!localGov) return res.status(404).send('Local gov\'t with given ID not found.');

    const pilgrims = await Pilgrim
        .find({ 
            deleted: true, 
            'enrollmentDetails.enrollmentYear': year,
            'enrollmentDetails.enrollmentZone': localGov._id
        })
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', '-_id year')
        .sort('enrollmentDetails.enrollmentZone.code');

    return res.send(pilgrims);
});

// Post Image
router.post('/image', [auth, upload.array('files', 3)], (req, res) => {
    const files = req.files;    
    if ((!files) || files.length < 1) return res.status(400).send('Please upload a file');

    res.send({ message: 'Image received successfully.' });
});

// Fetch image
router.get('/image/:name', (req, res) => {
    return res.sendFile(path.join(imagePath, req.params.name));
});

module.exports = router;