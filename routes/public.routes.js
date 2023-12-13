const express = require('express');
const mongoose = require('mongoose');

const basicAuth = require('../middleware/basicAuth');
const { LocalGovernment } = require('../models/localGovernment.model');
const { Year } = require('../models/years.model');
const { Pilgrim } = require('../models/pilgrim.model');
const { Allocation } = require('../models/allocation.model');

const router = express.Router();

router.get('/centers', basicAuth, async (req, res) => {
  const localGov = await LocalGovernment.find()
    .sort('name')
    .select('_id name code');

  res.json(localGov);
});

router.get('/hajj-years', basicAuth, async (req, res) => {
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

router.get('/pilgrims/:idOrEmailOrPhone', basicAuth, async (req, res) => {
  const idOrEmailOrPhone = req.params.idOrEmailOrPhone;
  let query = {};
  if (mongoose.Types.ObjectId.isValid(req.params.idOrEmailOrPhone)) {
    query._id = idOrEmailOrPhone;
  } else {
    query = {
      $or: [
        { 'personalDetails.email': idOrEmailOrPhone },
        { 'personalDetails.phone': idOrEmailOrPhone },
        { 'personalDetails.alternatePhone': idOrEmailOrPhone },
      ],
    };
  }

  const pilgrim = await Pilgrim.findOne(query)
    .populate('personalDetails.stateOfOrigin', '_id name')
    .populate('personalDetails.localGovOfOrigin', '_id name')
    .populate('createdBy', '-_id name');
  if (!pilgrim) return res.status(404).json({ error: 'Pilgrim not found' });

  return res.status(200).json(pilgrim);
});

router.get('/pilgrims', basicAuth, async (req, res) => {
  const pageSize = +req.query.pageSize || 5;
  const page = +req.query.page || 1;

  const totalDocs = await Pilgrim.countDocuments();

  const pilgrims = await Pilgrim.find()
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate('personalDetails.stateOfOrigin', '_id name')
    .populate('personalDetails.localGovOfOrigin', '_id name')
    .populate('createdBy', '_id name');

  return res.json({ pilgrims, totalDocs });
});

router.get('/allocations/:idOrEmailOrPhone', basicAuth, async (req, res) => {
  const pageSize = +req.query.pageSize || 5;
  const page = +req.query.page || 1;
  const idOrEmailOrPhone = req.params.idOrEmailOrPhone;

  const query = {
    deleted: false,
    migrated: false,
  };

  if (mongoose.Types.ObjectId.isValid(req.params.idOrEmailOrPhone)) {
    query.pilgrim = idOrEmailOrPhone;
  } else {
    const pilgrim = await Pilgrim.findOne({
      $or: [
        { 'personalDetails.email': idOrEmailOrPhone },
        { 'personalDetails.phone': idOrEmailOrPhone },
        { 'personalDetails.alternatePhone': idOrEmailOrPhone },
      ],
    });
    if (!pilgrim) return res.status(404).json({ error: 'Pilgrim not found' });
    query.pilgrim = pilgrim._id;
  }

  const yearId = req.query.yearId;
  if (yearId) {
    if (!mongoose.Types.ObjectId.isValid(yearId))
      return res.status(400).json({ error: 'Invalid year id' });
    query.enrollmentYear = yearId;
  }

  const totalDocs = await Allocation.countDocuments(query);
  const allocations = await Allocation.find(query)
    .sort('enrollmentZone.name')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate('pilgrim')
    .populate('enrollmentYear', '-seatAllocations')
    .populate('enrollmentZone');

  res.json({ allocations, totalDocs });
});

router.get(
  '/allocations/:pilgrimCode/payments/pilgrim-code',
  basicAuth,
  async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;
    const pilgrimCode = req.params.pilgrimCode;

    const payments = await Allocation.find({ code: pilgrimCode }, [
      'paymentHistory',
      'enrollmentZone',
      'enrollmentYear',
    ])
      .sort('enrollmentZone.name')
      .populate('enrollmentYear', '-seatAllocations')
      .populate('enrollmentZone');

    res.json(payments);
  }
);

router.get(
  '/allocations/:idOrEmailOrPhone/payments',
  basicAuth,
  async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;
    const idOrEmailOrPhone = req.params.idOrEmailOrPhone;

    const query = {
      deleted: false,
      migrated: false,
    };

    if (mongoose.Types.ObjectId.isValid(req.params.idOrEmailOrPhone)) {
      query.pilgrim = idOrEmailOrPhone;
    } else {
      const pilgrim = await Pilgrim.findOne({
        $or: [
          { 'personalDetails.email': idOrEmailOrPhone },
          { 'personalDetails.phone': idOrEmailOrPhone },
          { 'personalDetails.alternatePhone': idOrEmailOrPhone },
        ],
      });
      if (!pilgrim) return res.status(404).json({ error: 'Pilgrim not found' });
      query.pilgrim = pilgrim._id;
    }

    const yearId = req.query.yearId;
    if (yearId) {
      if (!mongoose.Types.ObjectId.isValid(yearId))
        return res.status(400).json({ error: 'Invalid year id' });
      query.enrollmentYear = yearId;
    }

    const totalDocs = await Allocation.countDocuments(query);
    const payments = await Allocation.find(query, [
      'paymentHistory',
      'enrollmentZone',
      'enrollmentYear',
    ])
      .sort('enrollmentZone.name')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('enrollmentYear', '-seatAllocations')
      .populate('enrollmentZone');

    res.json({ payments, totalDocs });
  }
);

router.get('/allocations/:zoneId/zone', basicAuth, async (req, res) => {
  const pageSize = +req.query.pageSize || 5;
  const page = +req.query.page || 1;
  const zoneId = req.params.zoneId;

  if (!mongoose.Types.ObjectId.isValid(zoneId))
    return res.status(400).json({ error: 'Invalid ID' });
  const query = {
    deleted: false,
    migrated: false,
    enrollmentZone: zoneId,
  };

  const yearId = req.query.yearId;
  if (yearId) {
    if (!mongoose.Types.ObjectId.isValid(yearId))
      return res.status(400).json({ error: 'Invalid year id' });
    query.enrollmentYear = yearId;
  }

  const totalDocs = await Allocation.countDocuments(query);
  const allocations = await Allocation.find(query)
    .sort('enrollmentZone.name')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate('pilgrim')
    .populate('enrollmentYear', '-seatAllocations')
    .populate('enrollmentZone');

  res.json({ allocations, totalDocs });
});

router.get(
  '/allocations/:pilgrimCode/pilgrim-code',
  basicAuth,
  async (req, res) => {
    const pilgrimCode = req.params.pilgrimCode;
    const allocation = await Allocation.findOne({ code: pilgrimCode })
      .populate('pilgrim')
      .populate('enrollmentYear', '-seatAllocations -editHistory')
      .populate('enrollmentZone');

    if (!allocation)
      return res.status(404).json({ error: 'Allocation with code not found!' });
    res.json(allocation);
  }
);

module.exports = router;
