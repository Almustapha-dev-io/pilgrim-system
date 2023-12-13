const path = require('path');
const fs = require('fs');
const morgan = require('morgan');

const {appLogger:logger} = require('./startup/logging');
const express = require('express');

const app = express();

const accessLogPath = path.join(__dirname, 'access-logs.log');
const logStream = fs.createWriteStream(accessLogPath, { flags: 'a' });

app.use(express.json());
app.use(morgan('combined', { stream: logStream }));

// require('./startup/logging').log();
require('./startup/prod')(app);
require('./startup/routes')(app);
require('./startup/db')();
require('./startup/config')();
require('./startup/validation')();

const port = process.env.PORT || 3000;
app.listen(port, () => logger.info(`Listening on port ${port}...`));
