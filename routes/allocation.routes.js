const express = require('express');
const mongoose = require('mongoose');
const {
  Allocation,
  validateForUpdate,
  validate,
} = require('../models/allocation.model');
const { Year } = require('../models/years.model');
const { LocalGovernment } = require('../models/localGovernment.model');
const { Seat } = require('../models/seat.model');
const { Pilgrim } = require('../models/pilgrim.model');

const {
  initiator,
  reviewer,
  initiator_admin,
  admin_reviewer,
  initiator_reviewer_admin,
} = require('../middleware/role');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

const router = express();

router.get(
  '/:id',
  [auth, initiator_admin, validateObjectId],
  async (req, res) => {
    const allocation = await Allocation.findById(req.params.id)
      .populate('pilgrim')
      .populate('enrollmentZone', '_id name code')
      .populate('createdBy', '_id name');
    if (!allocation)
      return res.status(404).json({
        error:
          'Allocation with the given number has not been registered in your zone.',
      });

    return res.json(allocation);
  }
);

router.get(
  '/year/:id/:type',
  [auth, initiator_admin, validateObjectId],
  async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const year = await Year.findById(req.params.id);
    if (!year) return res.status(400).json({ error: 'Invalid year.' });

    const query = {
      deleted: false,
      enrollmentZone: req.userLga,
      enrollmentYear: year._id,
    };

    if (req.params.type === 'active') query.migrated = false;
    else if (req.params.type === 'migrated') query.migrated = true;
    else if (req.params.type === 'deleted') query.deleted = true;
    else return res.status(400).json({ error: 'Invalid type' });

    const totalDocs = await Allocation.countDocuments(query);
    const allocations = await Allocation.find(query)
      .populate('pilgrim')
      .populate('enrollmentZone')
      .populate('enrollmentYear')
      .populate('createdBy', 'name')
      .sort('enrollmentZone.code')
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    res.json({ totalDocs, allocations });
  }
);

router.get(
  '/zone/:id/year/:yearId/:type',
  [auth, reviewer, validateObjectId],
  async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    if (!mongoose.Types.ObjectId.isValid(req.params.yearId))
      res.status(400).json({ error: 'Invalid year ID.' });

    const query = {
      deleted: false,
      enrollmentZone: req.params.id,
      enrollmentYear: req.params.yearId,
    };

    if (req.params.type === 'active') query.migrated = false;
    else if (req.params.type === 'migrated') query.migrated = true;
    else if (req.params.type === 'deleted') query.deleted = true;
    else return res.status(400).json({ error: 'Invalid type' });

    const totalDocs = await Allocation.countDocuments(query);
    const allocations = await Allocation.find(query)
      .populate('pilgrim')
      .populate('enrollmentZone')
      .populate('enrollmentYear')
      .populate('createdBy', 'name')
      .sort('enrollmentZone.code')
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    res.json({ allocations, totalDocs });
  }
);

router.put('/add-payment/:id', [auth, validateObjectId], async (req, res) => {
  const { error } = validateForUpdate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const allocation = await Allocation.findById(req.params.id);
  if (!allocation)
    return res
      .status(404)
      .json({ error: 'Allocation with given ID not found' });

  const { paymentHistory } = req.body;
  if (!paymentHistory || paymentHistory.length < 1) {
    return res.status(400).json({ error: 'Provide atleast one transaction.' });
  }

  const duplicateTransactions = allocation.paymentHistory.filter((a) =>
    paymentHistory.find((b) => {
      return (
        a.tellerNumber === b.tellerNumber || a.receiptNumber === b.receiptNumber
      );
    })
  );
  if (!duplicateTransactions.length)
    return res
      .status(400)
      .json({ error: 'Duplicate transactions were spotted.' });

  allocation.paymentHistory = [...paymentHistory];
  await allocation.save();
  res.json(allocation);
});

router.put('/migrate', auth, async (req, res) => {
  const { yearId, allocationNumber, allocationId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(allocationId))
    return res.status(400).json({ error: 'Invalid allocation id' });
  if (!mongoose.Types.ObjectId.isValid(yearId))
    return res.status(400).json({ error: 'Invalid year id' });
  if (!allocationNumber || allocationNumber <= 0)
    return res.status(400).json({ error: 'Invalid allocation number' });

  const previousAllocation = await Allocation.findById(allocationId).populate(
    'pilgrim'
  );
  if (!previousAllocation)
    return res.status(400).json({ error: 'Allocation not found' });

  if (!previousAllocation.pilgrim)
    return res.status(404).json({ error: 'Pilgrim with given ID not found.' });
  if (previousAllocation.deleted)
    return res
      .status(400)
      .json({ error: 'Cannot migrate allocation flagged for deletion.' });

  let year = await Year.findById(yearId);
  if (!year) return res.status(404).json({ error: 'Year not found' });

  const pilgrimAllocated = await Allocation.findOne({
    pilgrim: previousAllocation.pilgrim._id,
    enrollmentYear: year._id,
    migrated: false,
    deleted: false,
  });
  if (pilgrimAllocated)
    return res
      .status(400)
      .json({ error: 'Pilgrim already allocated for the selected hajj year.' });

  const seatAllocations = year.seatAllocations;
  if (!seatAllocations)
    return res.status(400).json({ error: 'No allocations for this year' });

  const zoneAllocations = seatAllocations.find(
    (al) => al.zone.toString() === previousAllocation.enrollmentZone.toString()
  );
  if (!zoneAllocations)
    return res.status(400).json({
      error: 'No seat allocations for this registration zone. Contact admin',
    });

  if (zoneAllocations.seatsAllocated < allocationNumber) {
    return res
      .status(400)
      .json(
        `Only ${zoneAllocations.seatsAllocated} allocations are allowed for this registration center.`
      );
  }

  const zone = await LocalGovernment.findById(
    previousAllocation.enrollmentZone
  );
  if (!zone) return res.status(400).json({ error: 'Invalid enrollment zone.' });

  let seat = await Seat.findOne({
    seatNumber: allocationNumber,
    zone: zone._id,
    year: year._id,
  });
  if (seat)
    return res
      .status(400)
      .json({ error: 'The selected allocation number is unavailable' });

  const passportExpiryDate = new Date(
    previousAllocation.pilgrim.passportDetails.expiryDate
  ).getTime();
  if (passportExpiryDate <= new Date().getTime()) {
    return res
      .status(400)
      .json("Pilgrim's passport is expired. Please update passport details.");
  }

  const code = Allocation.generateCode(allocationNumber, year.year, zone.code);
  let allocation = await Allocation.findOne({ code });
  if (allocation)
    return res.status(400).json({ error: `${code} is unavailable` });

  seat = new Seat({
    seatNumber: allocationNumber,
    zone: zone._id,
    year: year._id,
  });

  allocation = new Allocation({
    pilgrim: previousAllocation.pilgrim._id,
    hajjExperience: previousAllocation.hajjExperience,
    lastHajjYear: previousAllocation.lastHajjYear,
    enrollmentZone: previousAllocation.enrollmentZone,
    paymentHistory: previousAllocation.paymentHistory,
    paymentHistory: previousAllocation.paymentHistory,
    code,
    enrollmentYear: year._id,
    enrollmentAllocationNumber: allocationNumber,
    createdBy: req.user._id,
  });

  previousAllocation.migrated = true;

  await allocation.save();
  await previousAllocation.save();
  await seat.save();

  // const session = await mongoose.startSession();
  // await session.withTransaction(() => Promise.all([
  //     allocation.save({ session }),
  //     previousAllocation.save({ session }),
  //      seat.save({ session })
  // ]));

  res.json({ allocation, previousAllocation });
});

router.post('/', [auth, initiator], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const {
    pilgrim: pilgrimId,
    enrollmentYear,
    enrollmentZone,
    enrollmentAllocationNumber,
  } = req.body;

  const pilgrim = await Pilgrim.findById(pilgrimId);
  if (!pilgrim) return res.status(404).json({ error: 'Pilgrim not found!' });

  const existing = await Allocation.findOne({
    pilgrim: pilgrimId,
    enrollmentYear,
    enrollmentZone,
  });
  if (existing)
    return res
      .status(400)
      .json({ error: 'Pilgrim already allocated for the year. Please update' });

  const year = await Year.findOne({ active: true, _id: enrollmentYear });
  if (!year) {
    return res
      .status(400)
      .json({
        error: `Hajj registration for ${enrollmentYear} not opened yet.`,
      });
  }

  const zone = await LocalGovernment.findById(enrollmentZone);
  if (!zone)
    return res.status(400).json({ error: 'Invalid enrollment center' });

  if (zone._id.toString() !== req.userLga.toString()) {
    return res
      .status(400)
      .json({ error: 'You cannot register pilgrims to zone.' });
  }

  const yearAllocations = year.seatAllocations.find(
    (lg) => lg.zone.toString() === zone._id.toString()
  );
  if (!yearAllocations)
    return res.status(400).json({ error: 'Seats not allocated to zone' });

  const allocatedSeats = yearAllocations.seatsAllocated;
  if (!allocatedSeats)
    return res
      .status(400)
      .json({ error: 'Seats not allocated to selected Center' });
  if (allocatedSeats < enrollmentAllocationNumber)
    return res.status(400).json({ error: 'Invalid allocation number.' });

  let seat = await Seat.findOne({
    seatNumber: enrollmentAllocationNumber,
    zone: zone._id,
    year: year._id,
  });
  if (seat)
    return res
      .status(400)
      .json({ error: 'Selected allocation number occupied.' });
  const code = Allocation.generateCode(
    enrollmentAllocationNumber,
    year.year,
    zone.code
  );

  let allocation = await Allocation.findOne({ code });
  if (allocation)
    return res.status(400).json({ error: `${code} is unavailable` });

  allocation = new Allocation({
    ...req.body,
    code,
    createdBy: req.user._id,
  });
  seat = new Seat({
    seatNumber: enrollmentAllocationNumber,
    zone: enrollmentZone,
    year: enrollmentYear,
  });

  await allocation.save();
  await seat.save();

  // const session = await mongoose.startSession();
  // await session.withTransaction(() => Promise.all([
  //     Allocation.create([allocation], { session }),
  //     Seat.create([seat], { session })
  // ]));

  res.json({ allocation, seat });
});

router.put('/:id/restore', [auth, validateObjectId], async (req, res) => {
  const { error } = validateForUpdate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { enrollmentAllocationNumber } = req.body;
  if (!enrollmentAllocationNumber) {
    return res.status(400).json({ error: 'Provide a new allocation number.' });
  }

  const allocation = await Allocation.findById(req.params.id).populate(
    'pilgrim'
  );
  if (!allocation)
    return res.status(400).json({ error: 'Invalid allocation id.' });

  if (
    allocation.code ||
    allocation.enrollmentAllocationNumber ||
    !allocation.deleted
  ) {
    return res
      .status(400)
      .json(
        'This allocation has been allocated a seat. To change please unassign seat'
      );
  }

  const year = await Year.findOne({
    active: true,
    _id: allocation.enrollmentYear,
  });
  if (!year)
    return res.status(400).json({ error: `Hajj registration not opened yet.` });

  const zone = await LocalGovernment.findById(allocation.enrollmentZone);
  if (!zone) return res.status(400).json({ error: 'Invalid enrollment zone.' });

  const zoneAllocations = year.seatAllocations.find(
    (lg) => lg.zone.toString() === zone._id.toString()
  );
  if (!zoneAllocations)
    return res
      .status(400)
      .json({ error: 'Seats not allocated to specified Center.' });

  const allocatedSeats = zoneAllocations.seatsAllocated;
  if (!allocatedSeats)
    return res
      .status(400)
      .json({ error: 'Seats not allocated to selected Center' });
  if (allocatedSeats < enrollmentAllocationNumber)
    return res.status(400).json({ error: 'Invalid allocation number.' });

  let seat = await Seat.findOne({
    seatNumber: enrollmentAllocationNumber,
    zone: zone._id,
    year: year._id,
  });
  if (seat)
    return res
      .status(400)
      .json({ error: 'Selected allocation number occupied.' });

  const code = Allocation.generateCode(
    enrollmentAllocationNumber,
    year.year,
    zone.code
  );

  const existingAllocation = await Allocation.findOne({ code });
  if (existingAllocation)
    return res.status(400).json({ error: 'Allocation number unavailable' });

  allocation.code = code;
  allocation.enrollmentAllocationNumber = enrollmentAllocationNumber;
  allocation.deleted = false;
  allocation.deletionReason = '';

  seat = new Seat({
    seatNumber: enrollmentAllocationNumber,
    zone: zone._id,
    year: year._id,
  });

  await pilgrim.save();
  await seat.save();

  // const session = await mongoose.startSession();
  // await session.withTransaction(() => Promise.all([
  //     allocation.save({ session }),
  //     seat.save({ session })
  // ]));

  res.json({ allocation, seat });
});

router.delete(
  '/:id',
  [auth, admin_reviewer, validateObjectId],
  async (req, res) => {
    let allocation = await Allocation.findById(req.params.id);
    if (!allocation)
      return res.status(400).json({ error: 'Invalid allocation!' });

    const { deletionReason, fundRefunded, amountRefunded } = req.query;
    if (!deletionReason)
      return res
        .status(400)
        .json({ error: 'Please provide a reason for deletion.' });
    // if (!fundRefunded) return res.status(400).json({error: 'Invalid fund refund details sent.'});
    // if (!amountRefunded || Number.isNaN(Number(amountRefunded)) || Number(amountRefunded) < 0) {
    //     return res.status(400).json({error: 'Send a valid refund amount.'});
    // }

    await Seat.findOneAndDelete({
      zone: allocation.enrollmentZone,
      seatNumber: allocation.enrollmentAllocationNumber,
      year: allocation.enrollmentYear,
    });

    allocation = await Allocation.findByIdAndUpdate(
      allocation._id,
      {
        $set: {
          deleted: true,
          deletionReason,
          code: undefined,
          enrollmentAllocationNumber: undefined,
        },
      },
      { new: true, useFindAndModify: false }
    );

    // const session = await mongoose.startSession();
    // await session.withTransaction(() => Promise.all([
    //     Seat.findOneAndDelete({
    //         zone: allocation.enrollmentZone,
    //         seatNumber: allocation.enrollmentAllocationNumber,
    //         year: allocation.enrollmentYear
    //     }),
    //     Allocation.findByIdAndUpdate(allocation._id, { $set: {
    //         deleted: true,
    //         deletionReason,
    //         code: undefined,
    //         enrollmentAllocationNumber: undefined
    //     }}, { new: true, useFindAndModify: false })
    // ]));

    res.json(allocation);
  }
);

module.exports = router;
