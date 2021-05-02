const multer = require('multer');
const path = require('path');
const pathHelper = require('../util/path');

const imagePath = path.join(pathHelper, '..', 'public', 'images');
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, imagePath)
    },
    filename: (req, file, callback) => {
        callback(null, file.originalname)
    }
});

module.exports = multer({ storage });