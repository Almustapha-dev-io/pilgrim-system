const config = require('config');

module.exports = function () {
    if (!config.get('jwtPrivateKey')) {
        throw new Error('FATAL ERROR: jwtPrivateKey is not defined.');
    }
    
    if (!config.get('database')) {
        throw new Error('FATAL ERROR: database is not defined.');
    }
    
    if (!config.get('basicAuthUser')) {
        throw new Error('FATAL ERROR: basic auth username is not defined.');
    }

    if (!config.get('basicAuthPassword')) {
        throw new Error('FATAL ERROR: basic auth password is not defined.');
    }
}