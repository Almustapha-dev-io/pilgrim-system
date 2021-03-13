const config = require('config');
const mongoose = require('mongoose');
const winston = require('winston');

const {appLogger: logger} = require('./logging');

module.exports = () => {
    // connect to database or log to console on success or log and terminate on failure
    mongoose.connect(config.get('database'), { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
        .then(() => logger.info('Connected to MongoDB successfully...'));
}
