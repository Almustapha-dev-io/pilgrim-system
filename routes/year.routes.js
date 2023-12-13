const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { Year, validate, validateForUpdate } = require('../models/years.model');
const { LocalGovernment } = require('../models/localGovernment.model');
const { Pilgrim } = require('../models/pilgrim.model');

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', auth, async (req, res) => {
  const pageSize = +req.query.pageSize || 5;
  const page = +req.query.page || 1;

  const totalDocs = await Year.countDocuments();

  const years = await Year.find()
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate('seatAllocations.zone', 'name code')
    .sort('-year')
    .select('-__v');

  res.json({ years, totalDocs });
});

router.get('/by-year/:year', auth, async (req, res) => {
  const year = await Year.findOne({ year: req.params.year });
  if (!year) return res.status(404).send(req.params.year + ' not found.');

  res.json(year);
});

router.get('/all', auth, async (req, res) => {
  const years = await Year.find()
    .populate('seatAllocations.zone', 'name code')
    .sort('-year')
    .select('-__v');

  res.json(years);
});

router.get('/get-active/all', auth, async (req, res) => {
  const years = await Year.find({ active: true }).sort('-year');

  res.json(years);
});

router.get('/get-active', auth, async (req, res) => {
  const pageSize = +req.query.pageSize || 5;
  const page = +req.query.page || 1;

  const totalDocs = await Year.countDocuments({ active: true });

  const years = await Year.find({ active: true })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .sort('-year');

  res.json({ years, totalDocs });
});

router.get('/get-inactive', auth, async (req, res) => {
  const pageSize = +req.query.pageSize || 5;
  const page = +req.query.page || 1;

  const totalDocs = await Year.countDocuments({ active: false });

  const years = await Year.find({ active: false })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .sort('-year');

  res.json({ years, totalDocs });
});

router.get('/:id', [auth, validateObjectId], async (req, res) => {
  const year = await Year.findById(req.params.id)
    .populate('seatAllocations.zone', 'name code')
    .select('-__v');

  res.json(year);
});

router.get('/updates/:id', [auth, validateObjectId], async (req, res) => {
  let year = await Year.findById(req.params.id).select('editHistory');
  const history = year.editHistory ? year.editHistory : [];
  res.json(history);
});

router.get(
  '/allocated-seats-for-lga/:id',
  [auth, validateObjectId],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.body.zoneId)) {
      return res.status(400).send('Invalid Zone ID');
    }

    const year = await Year.findById(req.params.id).populate(
      'seatAllocations.zone',
      '_id name code'
    );

    if (!year) return res.status(404).send('Year with given ID not found.');

    const fetchedZone = year.seatAllocations.find(
      (a) => a.zone._id.toString() === req.body.zoneId.toString()
    );
    if (!fetchedZone)
      return res
        .status(404)
        .send('Selected zone not in seat allocations list.');

    res.json(fetchedZone);
  }
);

router.post('/', [auth, superAdmin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { year, active, dateOpened, lastClosed, seatAllocations } = req.body;

  if (seatAllocations.length > 0) {
    const validObjectIDs = seatAllocations.every((lg) =>
      mongoose.Types.ObjectId.isValid(lg.zone)
    );
    if (!validObjectIDs) return res.status(400).send('Invalid Zone ID');
  }

  let fetchedYear = await Year.findOne({ year: req.body.year });
  if (fetchedYear)
    return res
      .status(400)
      .send(`${fetchedYear.year} Hajj year already opened.`);

  fetchedYear = new Year({
    year,
    active,
    dateOpened,
    lastClosed,
    seatAllocations,
  });

  fetchedYear = await fetchedYear.save();
  res.json(fetchedYear);
});

/*
 *   Add LGA seat allocations to a year
 *   @Params yearId as id
 *   @Body Takes the seatAllocation object { zoneId, seatNumber }  as req body
 */
router.put(
  '/add-allocation/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { seatAllocations } = req.body;
    if (seatAllocations.length < 1) {
      return res.status(400).send('Please provide atleast one allocation.');
    }

    const validObjectIDs = seatAllocations.every((lg) =>
      mongoose.Types.ObjectId.isValid(lg.zone)
    );
    if (!validObjectIDs) return res.status(400).send('Invalid Zone ID');

    let year = await Year.findById(req.params.id);
    if (!year) return res.status(400).send('Invalid year ID.');

    const duplicateAllocations = year.seatAllocations.filter((a) =>
      seatAllocations.find((b) => a.zone.toString() === b.zone.toString())
    );
    if (duplicateAllocations.length > 0) {
      return res
        .status(400)
        .send('Seats have been allocated to the specified center.');
    }

    year.seatAllocations = [...year.seatAllocations, ...seatAllocations];

    year = await year.save();
    res.json(year);
  }
);

router.put(
  '/edit-seat-allocation/:id',
  [auth, validateObjectId],
  async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { zone, seatsAllocated } = req.body;
    if (!zone || !seatsAllocated)
      return res.status(400).send('Please provide all required parameters');

    let year = await Year.findById(req.params.id);
    if (!year) return res.status(400).send('Please provide a valid year');

    if (!mongoose.Types.ObjectId.isValid(zone)) {
      return res.status(400).send('Zone ID provided is invalid');
    }

    let zoneIndex = year.seatAllocations.findIndex(
      (z) => z.zone.toString() === zone.toString()
    );
    if (zoneIndex === -1)
      return res
        .status(400)
        .send('Provided zone has not been allocated any seats.');

    const pilgrimsCount = await Pilgrim.countDocuments({
      'enrollmentDetails.enrollmentYear': year._id,
      'enrollmentDetails.enrollmentZone': year.seatAllocations[zoneIndex].zone,
    });

    if (pilgrimsCount > seatsAllocated) {
      return res
        .status(400)
        .send(
          'Number of pilgrims registered to this center are greater than the new slots.'
        );
    }

    const zoneObject = await LocalGovernment.findById(zone);
    if (!zoneObject)
      return res.status(404).send('Zone with given ID not found');

    const previousSeatNumber = year.seatAllocations[zoneIndex].seatsAllocated;
    const newSeatNumber = seatsAllocated;
    const difference = newSeatNumber - previousSeatNumber;
    const editDetails = {
      previousSeatNumber,
      newSeatNumber,
      difference,
      zone: zoneObject,
      date: new Date(),
    };

    if (!year.editHistory) {
      year.editHistory = [];
    }

    year.editHistory.push(editDetails);
    year.seatAllocations[zoneIndex].seatsAllocated = seatsAllocated;
    year = await year.save();
    res.json(year);
  }
);

/* router.post('/open-new-hajj-year', [auth, superAdmin], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const date = new Date();
    const newYear = moment(date).format('YYYY');
    
    let year = await Year.findOne({ year: newYear });
    if (year) return res.status(400).send(`${newYear} Hajj year already opened.`);

    await Year.updateMany({}, {
        $set: { active: false }
    });

    year = new Year({ year: newYear, active: true });

    year = await year.save();
    res.json(year);
});
 */
router.put(
  '/reopen-hajj-year/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const year = await Year.findByIdAndUpdate(
      req.params.id,
      {
        $set: { active: true },
      },
      { new: true, useFindAndModify: false }
    );
    if (!year) return res.status(404).send(`${newYear} Hajj not opened yet.`);

    res.json(year);
  }
);

router.put(
  '/close-hajj-year/:id',
  [auth, /* superAdmin, */ validateObjectId],
  async (req, res) => {
    const year = await Year.findByIdAndUpdate(
      req.params.id,
      {
        $set: { active: false, lastClosed: new Date() },
      },
      { new: true, useFindAndModify: false }
    );
    if (!year) return res.status(400).send('There is no active hajj year.');

    res.json(year);
  }
);

module.exports = router;
