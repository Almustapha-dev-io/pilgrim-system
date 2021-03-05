const express = require('express');
const cors = require('cors');
const error = require('../middleware/error');
const path = require('path');

const auths = require('../routes/auth');
const users = require('../routes/user.routes');
const banks = require('../routes/bank.routes');
const lgas = require('../routes/lga.routes');
const localGovs = require('../routes/localGovernment.routes');
const pilgrims = require('../routes/pilgrim.routes');
const roles = require('../routes/role.routes');
const states = require('../routes/states.routes');
const years = require('../routes/year.routes');

module.exports = function(app) {
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(cors());
    
    app.use('/api/users', users);
    app.use('/api/auths', auths);
    app.use('/api/banks', banks);
    app.use('/api/local-govs', lgas);
    app.use('/api/enrollment-zones', localGovs);
    app.use('/api/pilgrims', pilgrims);
    app.use('/api/roles', roles);
    app.use('/api/states', states);
    app.use('/api/years', years);

    app.use(error);
};