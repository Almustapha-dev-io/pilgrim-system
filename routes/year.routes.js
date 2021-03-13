const express = require('express');
const moment = require('moment');
const router = express.Router();

const { Year } = require('../models/years.model');

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');

const validateObjectId = require('../middleware/validateObjectId');

router.get('/', auth, async (req, res, next) => {
    const years = await Year.find()
        .sort('-year');

    res.send(years);
});

router.get('/get-active', auth, async (req, res) => {
    const year = await Year.find({ active: true });

    res.send(year);
});

router.get('/get-inactive', auth, async (req, res) => {
    const years = await Year.find({ active: false }).sort('-year');

    res.send(years);
});

router.post('/open-new-hajj-year', [auth, superAdmin], async (req, res) => {
    const date = new Date();
    const newYear = moment(date).format('YYYY');
    
    let year = await Year.findOne({ year: newYear });
    if (year) return res.status(400).send(`${newYear} Hajj year already opened.`);

    await Year.updateMany({}, {
        $set: { active: false }
    });

    year = new Year({ year: newYear, active: true });

    year = await year.save();
    res.send(year);
});

router.put('/reopen-hajj-year', [auth, superAdmin], async (req, res) => {
    const date = new Date();
    const newYear = moment(date).format('YYYY');

    const year = await Year.findOneAndUpdate({ year: newYear }, {
        $set: { active: true }
    }, { new: true, useFindAndModify: false });
    if (!year) return res.status(404).send(`${newYear} Hajj not opened yet.`);

    res.send(year);
});

router.put('/close-hajj-year', [auth, superAdmin], async (req, res) => {
    const year = await Year.findOneAndUpdate({ active: true }, {
        $set: { active: false, lastClosed: new Date() }
    }, { new: true, useFindAndModify: false });
    if (!year) return res.status(400).send('There is no active hajj year.');

    res.send(year);
});

module.exports = router;