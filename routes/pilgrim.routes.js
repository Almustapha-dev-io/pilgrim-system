const fs = require('fs');
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
const { Seat } = require('../models/seat.model');

const pathHelper = require('../util/path');
const imagePath = path.join(pathHelper, '..', 'public', 'images');

const router = express.Router();

// get pilgrim by id
router.get('/by-id/:id', [auth, initiator_admin, validateObjectId], async (req, res) => {
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
});

// get pilgrim by code
router.get('/by-code/:code', [auth, initiator_admin, validateObjectId], async (req, res) => {
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
});

//  get deleted pilgrims by lga and year
router.get('/deleted-by-year/:id', [auth, admin, validateObjectId], async (req, res) => {
    const yearId = req.params.id;
    
    const year = await Year.findById(yearId);
    if (!year) return res.status(400).send('Invalixd year.');

    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await Pilgrim.countDocuments({
        deleted: true, 
        'enrollmentDetails.enrollmentZone': req.userLga, 
        'enrollmentDetails.enrollmentYear': year._id
    });

    const pilgrims = await Pilgrim
        .find({
            deleted: true,
            'enrollmentDetails.enrollmentZone': req.userLga,
            'enrollmentDetails.enrollmentYear': year._id
        })
        .sort('enrollmentDetails.enrollmentZone.code')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', 'year');

    return res.send({ pilgrims, totalDocs });
});

// get all pilgrims in an lga by initiator /admin
router.get('/by-year/:id', [auth, initiator_admin, validateObjectId], async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await Pilgrim.countDocuments({
        deleted: false, 
        'enrollmentDetails.enrollmentZone': req.userLga, 
        'enrollmentDetails.enrollmentYear': req.params.id
    });

    const yearId = req.params.id;

    const year = await Year.findById(yearId);
    if (!year) return res.status(400).send('Invalid year');

    const pilgrims = await Pilgrim
        .find({ 
            deleted: false, 
            'enrollmentDetails.enrollmentZone': req.userLga, 
            'enrollmentDetails.enrollmentYear': year._id 
        })
        .sort('enrollmentDetails.enrollmentZone.code')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', 'year');

    return res.send({ pilgrims, totalDocs });
});

// Update pilgrim payment
router.put('/add-payments/:id', [auth,/*  initiator, */ validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let pilgrim = await Pilgrim.findById(req.params.id);
    if (!pilgrim) return res.status(404).send('Pilgrim with given ID not found');

    const { paymentHistory } = req.body;
    if (!paymentHistory) {
        return res.status(400).send('Provide atleast one transaction.');
    }
    
    if (paymentHistory.length < 1) {
        return res.status(400).send('Provide atleast one transaction.');
    }

    const duplicateTransactions = pilgrim.paymentHistory.filter(a => paymentHistory.find(b => {
        return (a.tellerNumber === b.tellerNumber) || (a.receiptNumber === b.receiptNumber)
    }));

    if (duplicateTransactions.length > 0) {
        return res.status(400).send('Duplicate transactions were spotted.');
    }

    pilgrim.paymentHistory = [...pilgrim.paymentHistory, ...paymentHistory];

    pilgrim = await pilgrim.save();
    res.send(pilgrim);
});

// create pilgrim initiator
router.post('/', [auth, initiator], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { enrollmentDetails, personalDetails, officeDetails, nextOfKinDetails, 
            passportDetails, paymentHistory, attachedDocuments } = req.body;
            
    const  userLga = req.userLga;

    const year = await Year.findOne({ 
        active: true,
        year: enrollmentDetails.enrollmentYear
    });
    if (!year) {
        return res.status(400).send(`Hajj registration for ${enrollmentDetails.enrollmentYear} not opened yet.`);
    }

    const localGov = await LocalGovernment.findById(enrollmentDetails.enrollmentZone);
    if (!localGov) return res.status(400).send('Invalid enrollment local gov\'t.');

    if (localGov._id.toString() !== userLga.toString()) {
        return res.status(400).send('Sorry, you cannot register pilgrims to the selected zone');
    }

    const lgaYearAllocationDetails = year.seatAllocations.find(lg => lg.zone.toString() === localGov._id.toString());
    if (!lgaYearAllocationDetails) {
        return res.status(400).send('Seats not allocated to specified Center.');
    }

    const allocatedSeats = lgaYearAllocationDetails.seatsAllocated;
    if (allocatedSeats <= 0) {
        return res.status(400).send('Seats not allocated to selected Center');
    }

    if (allocatedSeats < enrollmentDetails.enrollmentAllocationNumber) {
        return res.status(400).send('Invalid allocation number.')
    }

    let seat = await Seat.findOne({
        seatNumber: enrollmentDetails.enrollmentAllocationNumber,
        zone: localGov._id,
        year: year._id
    });
    if (seat) {
        return res.status(400).send('Selected allocation number occupied.');
    }

    const state = await State.findById(personalDetails.stateOfOrigin);
    if (!state) return res.status(400).send('Invalid state of origin.');

    const lgaOfOrigin = await Lga.findById(personalDetails.localGovOfOrigin);
    if (!lgaOfOrigin) return res.status(400).send('Invalid local gov\'t of origin.');
    
    if (lgaOfOrigin.name.trim() === '00') {
        return res.status(400).send('Cannot assign pilgrim to this lga.');
    }

    let zeros = '';
    if (enrollmentDetails.enrollmentAllocationNumber < 10) {
        zeros = '000'
    } else if (enrollmentDetails.enrollmentAllocationNumber >= 10 && enrollmentDetails.enrollmentAllocationNumber < 100)  {
        zeros = '00'
    } else if (enrollmentDetails.enrollmentAllocationNumber >= 100 && enrollmentDetails.enrollmentAllocationNumber < 1000) {
        zeros = '0'
    }
    
    const pilgrimNumber = `KD${zeros + enrollmentDetails.enrollmentAllocationNumber}${localGov.code}-${year.year}`.toUpperCase();

    let pilgrim = await Pilgrim.findOne({ 'enrollmentDetails.code': pilgrimNumber });
    if (pilgrim) {
        return res.status(400).send(`Pilgrim ${pilgrimNumber} has been assigned to slot #${pilgrim.enrollmentDetails.enrollmentAllocationNumber}`);
    }

    const body = {
        enrollmentDetails: {
            ...enrollmentDetails,  
            code: pilgrimNumber, 
            enrollmentYear: year._id
        },
        personalDetails: {...personalDetails},
        officeDetails: {...officeDetails},
        nextOfKinDetails: {...nextOfKinDetails},
        passportDetails: {...passportDetails},
        paymentHistory: [...paymentHistory],
        attachedDocuments: {...attachedDocuments},
        createdBy: req.user._id
    };

    const session = await mongoose.startSession();
    await session.withTransaction(() => {
        pilgrim = new Pilgrim(body);
        seat = new Seat({
            seatNumber: pilgrim.enrollmentDetails.enrollmentAllocationNumber,
            zone: pilgrim.enrollmentDetails.enrollmentZone,
            year: pilgrim.enrollmentDetails.enrollmentYear
        });

        const reqs = [
            Pilgrim.create([pilgrim], { session }),
            Seat.create([seat], { session })
        ];

        return Promise.all(reqs);
    });

    res.send({pilgrim, seat});
});

/* 
*   Reassign Seat to deleted pilgrim
*   @Params: pilgrim ID
*   @Body: enrollmentDetails: { enrollmentAllocationNumber j}
*/
router.put('/assign-seat/:id', [auth, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    if (!req.body.enrollmentDetails || !req.body.enrollmentDetails.enrollmentAllocationNumber) {
        return res.status(400).send('Provide a new allocation number.');
    }

    let pilgrim = await Pilgrim.findById(req.params.id);
    if (!pilgrim) return res.status(400).send('Invalid Pilgrim ID.');

    if (pilgrim.enrollmentDetails.code || pilgrim.enrollmentDetails.enrollmentAllocationNumber) {
        return res.status(400).send('This pilgrim has been allocated a seat. To change please unassign seat');
    }

    const newNumber = req.body.enrollmentDetails.enrollmentAllocationNumber;

    const year = await Year.findOne({ 
        active: true,
        _id: pilgrim.enrollmentDetails.enrollmentYear
    });
    if (!year) {
        return res.status(400).send(`Hajj registration not opened yet.`);
    }

    const  userLga = req.userLga;

    const localGov = await LocalGovernment.findById(pilgrim.enrollmentDetails.enrollmentZone);
    if (!localGov) return res.status(400).send('Invalid enrollment local gov\'t.');

    if (localGov._id.toString() !== userLga.toString()) {
        return res.status(400).send('Sorry, you cannot register pilgrims to the selected zone');
    }

    const lgaYearAllocationDetails = year.seatAllocations.find(lg => lg.zone.toString() === localGov._id.toString());
    if (!lgaYearAllocationDetails) {
        return res.status(400).send('Seats not allocated to specified Center.');
    }

    const allocatedSeats = lgaYearAllocationDetails.seatsAllocated;
    if (allocatedSeats <= 0) {
        return res.status(400).send('Seats not allocated to selected Center');
    }

    if (allocatedSeats < newNumber) {
        return res.status(400).send('Invalid allocation number.')
    }

    let seat = await Seat.findOne({
        seatNumber: newNumber,
        zone: localGov._id,
        year: year._id
    });
    if (seat) {
        return res.status(400).send('Selected allocation number occupied.');
    }

    let zeros = '';
    if (newNumber < 10) {
        zeros = '000'
    } else if (newNumber >= 10 && newNumber < 100)  {
        zeros = '00'
    } else if (newNumber >= 100 && newNumber < 1000) {
        zeros = '0'
    }

    const pilgrimNumber = `KD${zeros + newNumber}${localGov.code}-${year.year}`.toUpperCase();
    let existingPilgrim = await Pilgrim.findOne({ 'enrollmentDetails.code': pilgrimNumber });
    if (existingPilgrim) {
        return res.status(400).send(`Pilgrim ${pilgrimNumber} has been assigned to seat ${existingPilgrim.enrollmentDetails.enrollmentAllocationNumber}`);
    }

    const session = await mongoose.startSession();
    await session.withTransaction(() => {
        pilgrim.enrollmentDetails.code = pilgrimNumber;
        pilgrim.enrollmentDetails.enrollmentAllocationNumber = newNumber;
        pilgrim.deleted = false;

        seat = new Seat({
            seatNumber: pilgrim.enrollmentDetails.enrollmentAllocationNumber,
            zone: pilgrim.enrollmentDetails.enrollmentZone,
            year: pilgrim.enrollmentDetails.enrollmentYear
        });
        
        const reqs = [
            pilgrim.save({ session }),
            seat.save({ session })
        ];

        return Promise.all(reqs);
    });

    res.send({pilgrim, seat});
});

//  update pilgrim admin (lga === pilgrim.lga)
router.put('/:id', [auth, admin, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let pilgrim = await Pilgrim.findById(req.params.id);
    if (!pilgrim) return res.status(400).send('Invalid pilgrim.');

    if (pilgrim.enrollmentDetails.enrollmentZone.toString() !== req.userLga.toString())
        return res.status(400).send('You cannot edit this pilgrim');

    pilgrim = await Pilgrim.findByIdAndUpdate(req.params.id, {
        $set: req.body
    }, { new: true, useFindAndModify: false });
    if (!pilgrim) return res.status(404).send('Pilgrim with given ID not found.');
    
    res.send(pilgrim);
});

router.delete('/:id', [auth, admin, validateObjectId], async (req, res) => {
    let pilgrim = await Pilgrim.findById(req.params.id);
    if (!pilgrim) return res.status(400).send('Invalid pilgrim.');

    if (pilgrim.enrollmentDetails.enrollmentZone.toString() !== req.userLga.toString())
        return res.status(400).send('You cannot delete this pilgrim');

    const session = await mongoose.startSession();
    await session.withTransaction(() => {
        const reqs = [
            Seat.findOneAndDelete({
                zone: pilgrim.enrollmentDetails.enrollmentZone,
                seatNumber: pilgrim.enrollmentDetails.enrollmentAllocationNumber,
                year: pilgrim.enrollmentDetails.enrollmentYear
            }),
            Pilgrim.findByIdAndUpdate(pilgrim._id, { $set: {
                deleted: true,
                'enrollmentDetails.code': undefined,
                'enrollmentDetails.enrollmentAllocationNumber': undefined
            }}, { new: true, useFindAndModify: false })
        ];

        return Promise.all(reqs);
    });
    
    res.send(pilgrim);
});

// get all pilgrims in an lga 
router.get('/reviewer/by-lga/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await Pilgrim.countDocuments({ 
        deleted: false, 
        'enrollmentDetails.enrollmentZone': req.params.id 
    });

    const { id: lgaId } = req.params;

    const pilgrims = await Pilgrim
        .find({ deleted: false, 'enrollmentDetails.enrollmentZone': lgaId })
        .sort('-dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '_id name code')
        .populate('personalDetails.stateOfOrigin', '_id name')
        .populate('personalDetails.localGovOfOrigin', '_id name')
        .populate('createdBy', '_id name');

    return res.send({ pilgrims, totalDocs });
});


// get pilgrim by code and lga
router.get('/reviewer/by-code-and-lga/:code/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    const { code: pilgrimCode, id: lgaId } = req.params;

    const pilgrim = await Pilgrim
        .findOne({ 
            'enrollmentDetails.code': pilgrimCode, 
            'enrollmentDetails.enrollmentZone': lgaId 
        })
        .populate('enrollmentDetails.enrollmentZone', '_id name code')
        .populate('personalDetails.stateOfOrigin', '_id name')
        .populate('personalDetails.localGovOfOrigin', '_id name')
        .populate('createdBy', '_id name');
    if (!pilgrim) return res.status(404).send('Pilgrim with the given data does not exist.');

    return res.send(pilgrim);
});

// get all pilgrims reviewer
router.get('/reviewer', [auth, reviewer], async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = req.query.page || 1;
    const totalDocs = await Pilgrim.countDocuments({ deleted: false });

    const pilgrims = await Pilgrim
        .find({ deleted: false })
        .sort('-dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code')
        .skip((page-1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '_id name code')
        .populate('personalDetails.stateOfOrigin', '_id name')
        .populate('personalDetails.localGovOfOrigin', '_id name')
        .populate('createdBy', '_id name');

    res.send({ pilgrims, totalDocs });   
});


// get all deleted pilgrims
router.get('/reviewer/deleted', [auth, reviewer], async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = req.query.page || 1;
    const totalDocs = await Pilgrim.countDocuments({ deleted: true });

    const pilgrims = await Pilgrim
        .find({ deleted: true })
        .sort('-year -dateCreated enrollmentDetails.enrollmentZone.name enrollmentDetails.code')
        .skip((page-1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '_id name code')
        .populate('personalDetails.stateOfOrigin', '_id name')
        .populate('personalDetails.localGovOfOrigin', '_id name')
        .populate('createdBy', '_id name')
        .populate('enrollmentYear', 'year');

    res.send({ pilgrims, totalDocs });
});


// get all pilgrims by year reviewer
router.get('/reviewer/by-year-and-lga/:lga/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    const year = req.params.id;
    const lga = req.params.lga

    if (!mongoose.Types.ObjectId.isValid(lga)) {
        return res.status(400).send('Invalid local government ID.');
    }

    const localGov = await LocalGovernment.findById(lga);
    if (!localGov) {
        return res.status(404).send('Local gov\'t with given ID not found.');
    }

    const pageSize = +req.query.pageSize || 5;
    const page = req.query.page || 1;
    const totalDocs = await Pilgrim.countDocuments({ 
        deleted: false, 
        'enrollmentDetails.enrollmentYear': year,
        'enrollmentDetails.enrollmentZone': localGov._id
    });

    const pilgrims = await Pilgrim
        .find({ 
            deleted: false, 
            'enrollmentDetails.enrollmentYear': year,
            'enrollmentDetails.enrollmentZone': localGov._id
        })
        .sort('enrollmentDetails.enrollmentZone.code')
        .skip((page-1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', '-_id year');

    return res.send({ pilgrims, totalDocs });
});

// Deleted By year and LGA
router.get('/reviewer/deleted-by-year-and-lga/:lga/:id', [auth, reviewer, validateObjectId], async (req, res) => {
    const year = req.params.id;
    const lga = req.params.lga

    if (!mongoose.Types.ObjectId.isValid(lga)) {
        return res.status(400).send('Invalid local government ID.');
    }

    const localGov = await LocalGovernment.findById(lga);
    if (!localGov) {
        return res.status(404).send('Local gov\'t with given ID not found.');
    }

    const pageSize = +req.query.pageSize || 5;
    const page = req.query.page || 1;
    const totalDocs = await Pilgrim.countDocuments({ 
        deleted: true, 
        'enrollmentDetails.enrollmentYear': year,
        'enrollmentDetails.enrollmentZone': localGov._id
    });

    const pilgrims = await Pilgrim
        .find({ 
            deleted: true, 
            'enrollmentDetails.enrollmentYear': year,
            'enrollmentDetails.enrollmentZone': localGov._id
        })
        .sort('enrollmentDetails.enrollmentZone.code')
        .skip((page-1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '-_id name code')
        .populate('personalDetails.stateOfOrigin', '-_id name')
        .populate('personalDetails.localGovOfOrigin', '-_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', '-_id year');

    res.send({ pilgrims, totalDocs });
});

// Post Image
router.post('/image', [auth, upload.array('files', 3)], (req, res) => {
    const files = req.files;    
    if ((!files) || files.length < 1) {
        return res.status(400).send('Please upload a file');
    }

    res.send({ message: 'Image received successfully.' });
});

// Fetch image
router.get('/image/:name', (req, res) => {
    const fileExtension = req.params.name.split('.')[1].toLowerCase();
    const jpgFiles = ['jpg', 'jpeg'];
    let contentType = 'image/png';

    if (jpgFiles.includes(fileExtension)) {
        contentType = 'image/jpeg';
    }

    const file = fs.createReadStream(path.join(imagePath, req.params.name));
    res.setHeader('Content-type', contentType);
    file.pipe(res);
    // return res.sendFile(path.join(imagePath, req.params.name));
});

module.exports = router;