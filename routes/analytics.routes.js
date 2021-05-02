
const express = require('express');
const mongoose = require('mongoose');
const validateObjectId = require('../middleware/validateObjectId');
const auth = require('../middleware/auth');

const { Pilgrim } = require('../models/pilgrim.model');
const { LocalGovernment } = require('../models/localGovernment.model');

const router = express.Router();

//  All pilgrims
router.get('/all-pilgrims', auth, async (req, res) => {
    const count = await Pilgrim.countDocuments();
    res.send({ count });
});

// All pilgrims count by year
router.get('/all-pilgrims-by-year/:id', [auth, validateObjectId], async (req, res) => {
    const count = await Pilgrim.countDocuments({ 'enrollmentDetails.enrollmentYear': req.params.id });
    res.send({ count });
});

// All pilgrims count for an lga
router.get('/lga-pilgrims-count/:id', [auth, validateObjectId], async (req, res) => {
    const count =  await Pilgrim.countDocuments({ 'enrollmentDetails.enrollmentZone': req.params.id });
    res.send({ count });
});

// All pilgrims count for an lga by year
router.get('/lga-pilgrims-count/:id/:yearId', [auth, validateObjectId], async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.yearId)) {
        return res.status(400).send('Invalid Year Id');
    }

    const count =  await Pilgrim
        .countDocuments({ 
            'enrollmentDetails.enrollmentZone': req.params.id,
            'enrollmentDetails.enrollmentYear': req.params.yearId
        });

    res.send({ count });
});

//  All Pilgrims count for all local gov
router.get('/all-lga-pilgrim-count', auth, async (req, res) => {
    const fetchedLocalGovs = await LocalGovernment
        .find({ code: {$nin: ['00', '01'] }})
        .select('_id name')
        .sort('name');

    const localGovsPilgrimsCount = [];
    const localGovs = [];

    let index = fetchedLocalGovs.length - 1;

    fetchedLocalGovs.forEach(async (lg, i) => {
        let count = await Pilgrim.countDocuments({ 'enrollmentDetails.enrollmentZone': lg._id });
        localGovsPilgrimsCount.push(count);
        localGovs.push(lg.name)

        if (index === i) return res.send([localGovsPilgrimsCount, localGovs]);
    });
});

// All pilgrims Pilgrims count for all local gov by year
router.get('/all-lga-pilgrim-count/:id', [auth, validateObjectId], async (req, res) => {
    const fetchedLocalGovs = await LocalGovernment
        .find({ code: {$nin: ['00', '01'] }})
        .select('_id name')
        .sort('name');

    const localGovsPilgrimsCount = [];
    const localGovs = [];

    let index = fetchedLocalGovs.length - 1;

    fetchedLocalGovs.forEach(async (lg, i) => {
        let count = await Pilgrim
            .countDocuments({ 
                'enrollmentDetails.enrollmentZone': lg._id,
                'enrollmentDetails.enrollmentYear': req.params.id
            });

        localGovsPilgrimsCount.push(count);
        localGovs.push(lg.name)

        if (index === i) return res.send([localGovsPilgrimsCount, localGovs]);
    });
});

module.exports = router;
