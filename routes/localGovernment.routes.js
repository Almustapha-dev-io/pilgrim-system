const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const { LocalGovernment, validate, validateForUpdate } = require('../models/localGovernment.model');

router.get('/', auth, async (req, res) => {
    const localGov = await LocalGovernment.find()
        .sort('name')
        .select('_id name code');
    
    res.send(localGov);
});


router.get('/:id', [auth, validateObjectId], async (req, res) => {
    const localGov = await LocalGovernment.findById(req.params.id);
    if (!localGov) return res.status(404).send('Local Gov\'t with given ID not found.');

    res.send(localGov);
});

router.post('/', [auth, superAdmin], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    
    const { name, code } = req.body;
    
    let localGov = await LocalGovernment.findOne({ name, code });
    if (localGov) return res.status(400).send(`${name} local government already exists.`);

    localGov = new LocalGovernment({ name, code });

    await localGov.save();

    res.send(localGov);
});

router.put('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const localGov = await LocalGovernment.findByIdAndUpdate(req.params.id, {
        $set: _.pick(req.body, ['name', 'code'])
    }, { new: true, useFindAndModify: false });
    if (!localGov) return res.status(404).send('Local gov\'t with given ID not found.');

    res.send(localGov);
});

router.delete('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const localGov = await LocalGovernment.findByIdAndRemove(req.params.id, { useFindAndModify: false });
    if (!localGov) return res.status(404).send('Local gov\'t with given ID not found.');

    res.send(localGov);
});

module.exports = router;