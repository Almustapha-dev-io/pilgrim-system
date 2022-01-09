const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { 
    initiator, 
    initiator_admin, 
    initiator_reviewer, 
} = require('../middleware/role');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const upload = require('../middleware/multer');

const { Pilgrim, validate, validateForUpdate } = require('../models/pilgrim.model');
const { State } = require('../models/state.model');
const { Lga } = require('../models/lga.model');

const pathHelper = require('../util/path');
const imagePath = path.join(pathHelper, '..', 'public', 'images');

const router = express.Router();

router.get('/:id', [auth, initiator_admin, validateObjectId], async (req, res) => {
    const pilgrim = await Pilgrim
        .findById(req.params.id)
        .populate('personalDetails.stateOfOrigin', '_id name')
        .populate('personalDetails.localGovOfOrigin', '_id name');

    if (!pilgrim) return res.status(404).send('Pilgrim with the given id has not been registered in your zone.');
    return res.send(pilgrim);
});

router.get('/filter/all', auth, async (req, res) => {
    const term = req.query.term ? req.query.term : '';
    const query = {
        $or: [
            { 'personalDetails.surname': { $regex: '.*' + term.toLowerCase() + '.*' } },
            { 'personalDetails.otherNames': { $regex: '.*' + term.toLowerCase() + '.*' } },
            { 'personalDetails.phone': { $regex: '.*' + term + '.*' } },
            { 'personalDetails.email': { $regex: '.*' + term.toLowerCase() + '.*' } },
            { 'passportDetails.passportNumber': { $regex: '.*' + term + '.*' } }
        ]
    }

    const pilgrims = await Pilgrim.find(query);
    res.send(pilgrims);
});

router.get('/', auth, async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await Pilgrim.countDocuments();
    const pilgrims = await Pilgrim.find()
        .populate('personalDetails.stateOfOrigin')
        .populate('personalDetails.localGovOfOrigin')
        .sort('-dateCreated')
        .skip((page-1)*pageSize)
        .limit(pageSize);

    res.send({ pilgrims, totalDocs });
});

// create pilgrim initiator
router.post('/', [auth, initiator], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const state = await State.findById(req.body.personalDetails.stateOfOrigin);
    if (!state) return res.status(400).send('Invalid state of origin.');

    const lgaOfOrigin = await Lga.findById(req.body.personalDetails.localGovOfOrigin);
    if (!lgaOfOrigin) return res.status(400).send('Invalid local gov\'t of origin.');

    if (lgaOfOrigin.name.trim() === '00') {
        return res.status(400).send('Cannot assign pilgrim to this lga.');
    }
    
    const mahrimDetails = req.body.mahrimDetails;
    pilgrim = new Pilgrim({
        ...req.body,
        mahrimDetails: mahrimDetails ? {...mahrimDetails} : null,
        createdBy: req.user._id
    });

    await pilgrim.save();
    res.send(pilgrim);
});

router.put('/:id', [auth, initiator_reviewer, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let pilgrim = await Pilgrim.findById(req.params.id);
    if (!pilgrim) return res.status(400).send('Invalid pilgrim.');

    pilgrim = await Pilgrim.findByIdAndUpdate(req.params.id, {
        $set: req.body
    }, { new: true, useFindAndModify: false });
    if (!pilgrim) return res.status(404).send('Pilgrim with given ID not found.');

    res.send(pilgrim);
});

router.post('/image', [auth, upload.array('files')], (req, res) => {
    const files = req.files;
    if ((!files) || files.length < 1) {
        return res.status(400).send('Please upload a file');
    }

    res.send({ message: 'Image received successfully.' });
});

router.get('/image/:name', async (req, res) => {
    const fileExtension = req.params.name.split('.')[1].toLowerCase();
    const jpgFiles = ['jpg', 'jpeg'];
    let contentType = 'image/png';

    if (jpgFiles.includes(fileExtension)) {
        contentType = 'image/jpeg';
    }
    fs.access(path.join(imagePath, req.params.name), fs.F_OK, e => {
        if (e) res.status(404).send('File not found!');

        else {
            const file = fs.createReadStream(path.join(imagePath, req.params.name));
            res.setHeader('Content-type', contentType);
            file.pipe(res);
        }
    });
});

module.exports = router;