const config = require('config');

const { atob } = require('../util/enc');

module.exports = function (req, res, next) {
    const authCredentials = req.header('Authorization');
    if (!authCredentials) return res.status(401).send('Access denied. credentials not provided');

    const base64Str = authCredentials.split('Basic')[1];
    if (!base64Str) return res.status(401).send('Basic authentication not valid');

    const decoded = atob(base64Str);
    const splitted = decoded.split(':');
    username = splitted[0];
    password = splitted[1];

    if (!username || !password) return res.status(401).send('Invalid credentials');
    if (username.toLowerCase() !== config.get('basicAuthUser')) return res.status(401).send('Invalid credentials');
    if (password !== config.get('basicAuthPassword')) return res.status(401).send('Invalid credentials');
    next();
};