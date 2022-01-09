
const express = require('express');
const mongoose = require('mongoose');
const validateObjectId = require('../middleware/validateObjectId');
const auth = require('../middleware/auth');

const { Pilgrim } = require('../models/pilgrim.model');
const { Allocation } = require('../models/allocation.model');
const { LocalGovernment } = require('../models/localGovernment.model');

const router = express.Router();

//  All pilgrims
router.get('/all-pilgrims', auth, async (req, res) => {
    const count = await Pilgrim.countDocuments();
    res.send({ count });
});

router.get('/all-allocations', auth, async (req, res) => {
    const count = await Allocation.countDocuments({ deleted: false });
    res.send({ count });
});

// All pilgrims count by year
router.get('/all-allocations-by-year/:id', [auth, validateObjectId], async (req, res) => {
    const count = await Allocation.countDocuments({ 'enrollmentYear': req.params.id, deleted: false });
    res.send({ count });
});

// All pilgrims count for an lga
router.get('/lga-allocations-count/:id', [auth, validateObjectId], async (req, res) => {
    const count =  await Allocation.countDocuments({ 'enrollmentZone': req.params.id, deleted: false });
    res.send({ count });
});

// All pilgrims count for an lga by year
router.get('/lga-allocations-count/:id/:yearId', [auth, validateObjectId], async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.yearId)) {
        return res.status(400).send('Invalid Year Id');
    }

    const count =  await Allocation
        .countDocuments({ 
            'enrollmentZone': req.params.id,
            'enrollmentYear': req.params.yearId
        });

    res.send({ count });
});

//  All Pilgrims count for all local gov
router.get('/all-lga-allocations-count', auth, async (req, res) => {
    const fetchedLocalGovs = await LocalGovernment
        .find({ code: {$nin: ['00', '01'] }})
        .select('_id name')
        .sort('name');

    const localGovsPilgrimsCount = [];
    const localGovs = [];

    let index = fetchedLocalGovs.length - 1;

    fetchedLocalGovs.forEach(async (lg, i) => {
        let count = await Allocation.countDocuments({ 'enrollmentZone': lg._id, deleted: false });
        localGovsPilgrimsCount.push(count);
        localGovs.push(lg.name)

        if (index === i) return res.send([localGovsPilgrimsCount, localGovs]);
    });
});

// All pilgrims Pilgrims count for all local gov by year
router.get('/all-lga-allocations-count/:id', [auth, validateObjectId], async (req, res) => {
    const fetchedLocalGovs = await LocalGovernment
        .find({ code: {$nin: ['00', '01'] }})
        .select('_id name')
        .sort('name');

    const localGovsPilgrimsCount = [];
    const localGovs = [];

    let index = fetchedLocalGovs.length - 1;

    fetchedLocalGovs.forEach(async (lg, i) => {
        let count = await Allocation
            .countDocuments({ 
                'enrollmentZone': lg._id,
                'enrollmentYear': req.params.id,
                deleted: false
            });

        localGovsPilgrimsCount.push(count);
        localGovs.push(lg.name)

        if (index === i) return res.send([localGovsPilgrimsCount, localGovs]);
    });
});

module.exports = router;
