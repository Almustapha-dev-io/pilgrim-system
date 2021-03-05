const winston = require('winston');
const config = require('config');
const mongoose = require('mongoose');

module.exports = () => {
    // connect to database or log to console on success or log and terminate on failure
    mongoose.connect(config.get('database'), { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
        .then(() => winston.info('Connected to MongoDB successfully...'));
}
