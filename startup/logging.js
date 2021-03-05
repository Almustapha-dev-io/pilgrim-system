const config = require('config');
const winston = require('winston');
require('winston-mongodb');
require('express-async-errors');

module.exports = function () {
    // general handler for logging all uncaught exceptions before app startup 
    winston.handleExceptions(
        // log error to console
        new winston.transports.Console({ colorize: true, prettyPrint: true }),
        // log error to uncaughtExceptions.log
        new winston.transports.File({ filename: 'uncaughtExceptions.log', level: 'error' }),
        // Log error to mongodb
        new winston.transports.MongoDB({
            db: config.get('database'),
            collection: 'uncaughtExceptions',
            level: 'error'
        }),
    );
    
    // general handler for logging unhandled promise rejections
    process.on('unhandledRejection', (ex) => {
        // on unhandled promise rejection throw exception to be logged by winston
        throw ex;
    });
    
    winston.add(winston.transports.File, { filename: 'logfile.log' });
    winston.add(winston.transports.MongoDB, {
        db: config.get('database'),
        collection: 'logs',
        level: 'error'
    });
}