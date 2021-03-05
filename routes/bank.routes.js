const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const { Bank, validate } = require('../models/bank.model');

router.get('/', auth, async (req, res) => {
    const banks = await Bank.find()
        .sort('name')
        .select('_id name');
    
    res.send(banks);
});

router.get('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const bank = await Bank.findById(req.params.id);
    if (!bank) return res.status(404).send('Bank with given ID not found.');

    res.send(bank);
});

router.post('/', [auth, superAdmin], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    
    const { name } = req.body;

    let bank = await Bank.findOne({ name });
    if (bank) return res.status(400).send(`${name} bank already exists.`);

    bank = new Bank(_.pick(req.body, ['name']));

    await bank.save();

    res.send(bank);
});

router.put('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const bank = await Bank.findByIdAndUpdate(req.params.id, {
        $set: _.pick(req.body, ['name'])
    }, { new: true, useFindAndModify: false });
    if (!bank) return res.status(404).send('Bank with given ID not found.');

    res.send(bank);
});

router.delete('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const bank = await Bank.findByIdAndRemove(req.params.id, { useFindAndModify: false });
    if (!bank) return res.status(404).send('Bank with given ID not found.');

    res.send(bank);
});

module.exports = router;