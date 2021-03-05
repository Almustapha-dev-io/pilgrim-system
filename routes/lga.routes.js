const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const { Lga, validate, validateForUpdate } = require('../models/lga.model');
const { State } = require('../models/state.model');

router.get('/', auth, async (req, res) => {
    const lgas = await Lga.find()
        .sort('name')
        .select('_id name state');
    
    res.send(lgas);
});

router.get('/by-state/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const lgas = await Lga.find({ state: req.params.id})
        .sort('name')
        .select('_id name state')
        .populate('state', '_id name');
    if (!lgas) return res.status(404).send('Local Gov\'t with given ID not found.');

    res.send(lgas);
});

router.get('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const lga = await Lga.findById(req.params.id);
    if (!lga) return res.status(404).send('Local Gov\'t with given ID not found.');

    res.send(lga);
});

router.post('/', [auth, superAdmin], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    
    const { name, stateId } = req.body;

    const state = await State.findById(stateId);
    if (!state) return res.status(404).send('State with give ID not found');
    
    let lga = await Lga.findOne({ name, state: stateId });
    if (lga) return res.status(400).send(`${name} local government already exists.`);

    lga = new Lga({ name, stateId });

    await lga.save();

    res.send(lga);
});

router.put('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    if (req.body.stateId) {
        const state = await State.findById(stateId);
        if (!state) return res.status(404).send('State with give ID not found');    }

    const lga = await Lga.findByIdAndUpdate(req.params.id, {
        $set: { name: req.body.name, state: req.body.stateId }
    }, { new: true, useFindAndModify: false });
    if (!lga) return res.status(404).send('Local gov\'t with given ID not found.');

    res.send(lga);
});

router.delete('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const lga = await Lga.findByIdAndRemove(req.params.id, { useFindAndModify: false });
    if (!lga) return res.status(404).send('Local gov\'t with given ID not found.');

    res.send(lga);
});

module.exports = router;