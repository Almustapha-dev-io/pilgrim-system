const config = require('config');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { Role } = require('../models/role.model');
const { LocalGovernment } = require('../models/localGovernment.model');

module.exports = async function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).send('Access denied. No token provided.');

    try {
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
        req.user = decoded;

        console.log(decoded);

        const userRole = req.user.role;
        if (!userRole) return res.status(400).send('Invalid user role');

        if(!mongoose.Types.ObjectId.isValid(userRole._id)) return res.status(404).send('Invalid Role ID.');
    
        const role = await Role.findById(userRole);
        if (!role) return res.status(400).send('Invalid role');
        req.role = role.name;

        const userLga = req.user.localGovernment;
        if (!userLga) return res.status(400).send('Invalid user lga');
    
        const localGovernment = await LocalGovernment.findById(userLga);
        if (!localGovernment) return res.status(400).send('Invalid local gov\'t');

        req.userLga = userLga;
        
        next();
    }
    catch (ex) {
        res.status(400).send('Invalid token.');
    }
}