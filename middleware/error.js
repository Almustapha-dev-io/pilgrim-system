const { appLogger: logger } = require('../startup/logging');

module.exports = function (err, req, res, next) {
  // Log Error
  logger.error(err.message);

  // Return an internal server error response to client
  let errorMessage = 'Something failed on the server. Try again.';
  console.log(err);
  if (err.message) errorMessage = err.message;
  res.status(500).json({ error: 'An error occured on the server!' });
};
