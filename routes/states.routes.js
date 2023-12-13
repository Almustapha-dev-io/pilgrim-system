const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const { State, validate } = require('../models/state.model');

router.get('/', auth, async (req, res) => {
  const states = await State.find().sort('name').select('_id name');

  res.json(states);
});

router.get('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
  const states = await State.findById(req.params.id);
  if (!states) return res.status(404).send('State with given ID not found.');

  res.json(states);
});

router.post('/', [auth, superAdmin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { name } = req.body;
  let state = await State.findOne({ name });
  if (state) return res.status(400).send(`${name} state already exists.`);

  state = new State({ name });
  await state.save();

  res.json(state);
});

router.put('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const state = await State.findByIdAndUpdate(
    req.params.id,
    {
      $set: _.pick(req.body, ['name']),
    },
    { new: true, useFindAndModify: false }
  );
  if (!state) return res.status(404).send('State with given ID not found.');

  res.json(state);
});

router.delete(
  '/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const state = await State.findByIdAndRemove(req.params.id, {
      useFindAndModify: false,
    });
    if (!state) return res.status(404).send('State with given ID not found.');

    res.json(state);
  }
);

module.exports = router;
