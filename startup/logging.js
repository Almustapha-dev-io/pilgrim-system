const config = require('config');
const winston = require('winston');
require('winston-mongodb');
require('express-async-errors');


const consoleTransport = new winston.transports.Console({ format: winston.format.simple() });
// const logFileTransport = new winston.transports.File({ filename: 'logfile.log', format: winston.format.simple() });
// const logMongoTransport = new winston.transports.MongoDB({
//     db: config.get('database'),
//     collection: 'logs',
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true,
    
// });

const errorConsoleTransport = new winston.transports.Console({ level: 'error', format: winston.format.json() });
const errorFileTransport = new winston.transports.File({ 
    filename: 'uncaughtExceptions.log', 
    level: 'error',
    format: winston.format.errors()
});
// const errorMongoTransport =  new winston.transports.MongoDB(new winston.transports.MongoDB({
//     db: config.get('database'),
//     collection: 'uncaughtExceptions',
//     level: 'error',
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true
// }));

const logger = winston.createLogger({
    level: 'info',
    transports: [consoleTransport, /* logMongoTransport, */ /* logFileTransport */errorFileTransport],
    exceptionHandlers: [errorConsoleTransport, errorFileTransport, /* errorMongoTransport */]
});

exports.appLogger = logger;
exports.log = () => {
    logger.exceptions.handle();
    process.on('unhandledRejection', (ex) => { throw ex });
};