const express = require('express');
const mongoose = require('mongoose');

const basicAuth = require('../middleware/basicAuth');
const { LocalGovernment } = require('../models/localGovernment.model');
const { Year } = require('../models/years.model');
const { Pilgrim } = require('../models/pilgrim.model');

const router = express.Router();

router.get('/centers', basicAuth, async (req, res) => {
    const localGov = await LocalGovernment.find()
        .sort('name')
        .select('_id name code');
    
    res.send(localGov);
});


router.get('/hajj-years', basicAuth, async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await Year.countDocuments();

    const years = await Year.find()
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('seatAllocations.zone', 'name code')
        .sort('-year')
        .select('-__v');

    res.send({years, totalDocs});
});


router.get('/pilgrims/:idOrEnrollmentCode', basicAuth, async (req, res) => {
    const idOrEnrollmentCode = req.params.idOrEnrollmentCode;

    let query = {};
    if(mongoose.Types.ObjectId.isValid(req.params.idOrEnrollmentCode)) {
        query._id = idOrEnrollmentCode;
    } else {
        query = { 'enrollmentDetails.code': idOrEnrollmentCode };
    }

    console.log(query)
    const pilgrim = await Pilgrim.findOne(query)
        .populate('enrollmentDetails.enrollmentZone', '_id name code')
        .populate('personalDetails.stateOfOrigin', '_id name')
        .populate('personalDetails.localGovOfOrigin', '_id name')
        .populate('createdBy', '-_id name')
        .populate('enrollmentDetails.enrollmentYear', 'year');
    if (!pilgrim) return res.status(404).send('Pilgrim not found')

    return res.status(200).send(pilgrim);
});


router.get('/pilgrims/:hajjYearId/:centerId', basicAuth, async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await Pilgrim.countDocuments({
        deleted: false,
        'enrollmentDetails.enrollmentZone': req.params.centerId,
        'enrollmentDetails.enrollmentYear': req.params.hajjYearId
    });

    const year = await Year.findById(req.params.hajjYearId);
    if (!year) return res.status(400).send('Invalid year');

    const center = await LocalGovernment.findById(req.params.centerId);
    if (!center) return res.status(400).send('Invalid center');

    const pilgrims = await Pilgrim
        .find({
            deleted: false,
            'enrollmentDetails.enrollmentZone': center._id,
            'enrollmentDetails.enrollmentYear': year._id
        })
        .sort('enrollmentDetails.enrollmentZone.code')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('enrollmentDetails.enrollmentZone', '_id name code')
        .populate('personalDetails.stateOfOrigin', '_id name')
        .populate('personalDetails.localGovOfOrigin', '_id name')
        .populate('createdBy', '_id name')
        .populate('enrollmentDetails.enrollmentYear', 'year');
    return res.send({ pilgrims, totalDocs });
});

module.exports = router;