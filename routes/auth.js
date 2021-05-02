const bcrypt = require('bcryptjs');
const Joi = require('joi');
const _ = require('lodash');
const { User } = require('../models/user.model');
const express = require('express');
const { Year } = require('../models/years.model');
const router = express.Router();

router.post('/', async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { email, password } = req.body;

    const user = await User
        .findOne({ email })
        .populate('role', '_id name');
    if (!user) return res.status(400).send('Invalid email or password.');
    
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) return res.status(400).send('Invalid email or password');
    
    const token = user.generateAuthToken();

    user.password = undefined;
    user.__v = undefined;
    user.dateCreated = undefined;

    res.send({ token, user });
});

function validate(user) {
    const schema = {
        email: Joi.string().min(5).max(50).required().email(),
        password: Joi.string().min(5).max(1023).required()
    };

    return Joi.validate(user, schema);
}

module.exports = router;