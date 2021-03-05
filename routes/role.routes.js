const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const { Role, validate } = require('../models/role.model');

router.get('/', [auth, superAdmin], async (req, res) => {
    const roles = await Role.find()
        .sort('name')
        .select('_id name state');
    
    res.send(roles);
});

router.post('/', async (req, res) => {
    try {
        const { error } = validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);
  
        let role = new Role(req.body);
        role = await role.save();
        
        res.send(role);
    } catch (err) {
        throw(err);
    }

});

router.get('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).send('Role with given ID not found.');

    res.send(role);
});


router.delete('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const role = await Role.findByIdAndRemove(req.params.id, { useFindAndModify: false });
    if (!role) return res.status(404).send('Role with given ID not found.');

    res.send(role);
});

module.exports = router;