const winston = require('winston');

module.exports = function (err, req, res, next) {
    // Log Error
    winston.error(err.message, err);

    console.log(err);
    // Return an internal server error response to client
    let errorMessage = 'Something failed. Try again.'

    if (err.errmsg) errorMessage = err.errmsg;

    if (err._message)  errorMessage = err._message;

    res.status(500).send(errorMessage);
}