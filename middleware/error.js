const { appLogger: logger} = require('../startup/logging');

module.exports = function (err, req, res, next) {
    // Log Error
    logger.error(err.message);

    // Return an internal server error response to client
    
    res.status(500).send('Something failed. Try again.');
}