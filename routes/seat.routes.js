const express = require('express');
const mongoose = require('mongoose');

const { Seat } = require('../models/seat.model');
const validateObjectId = require('../middleware/validateObjectId');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/taken/:id/:yearId', [auth, validateObjectId], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.yearId)) {
    return res.status(400).json({ error: 'Invalid year ID' });
  }

  const seatNumbers = await Seat.find({
    zone: req.params.id,
    year: req.params.yearId,
  });

  res.json(seatNumbers);
});

module.exports = router;
