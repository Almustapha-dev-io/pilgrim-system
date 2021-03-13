const bcrypt = require('bcryptjs');
const Joi = require('joi');
const _ = require('lodash');
const { User } = require('../models/user.model');
const express = require('express');
const { Year } = require('../models/years.model');
const router = express.Router();

const { appLogger: logger } = require('../startup/logging');

router.post('/', async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('role', '_id name');
    if (!user) return res.status(400).send('Invalid email or password.');
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const activeYear = await Year.findOne({ active: true });
    
    const token = user.generateAuthToken();

    logger.info(`${user.name}  : ${user.email} Logged in with token: ${token}`);
    res.send({ token, user, activeYear });
});

function validate(user) {
    const schema = {
        email: Joi.string().min(5).max(50).required().email(),
        password: Joi.string().min(5).max(1023).required()
    };

    return Joi.validate(user, schema);
}

module.exports = router;