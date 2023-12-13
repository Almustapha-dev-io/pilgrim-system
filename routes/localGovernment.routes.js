const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const {
  LocalGovernment,
  validate,
  validateForUpdate,
} = require('../models/localGovernment.model');

router.get('/', auth, async (req, res) => {
  const localGov = await LocalGovernment.find()
    .sort('name')
    .select('_id name code');

  res.json(localGov);
});

router.get('/:id', [auth, validateObjectId], async (req, res) => {
  const localGov = await LocalGovernment.findById(req.params.id);
  if (!localGov)
    return res
      .status(404)
      .json({ error: "Local Gov't with given ID not found." });

  res.json(localGov);
});

router.post('/', [auth, superAdmin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { name, code } = req.body;

  let localGov = await LocalGovernment.findOne({ name, code });
  if (localGov)
    return res
      .status(400)
      .json({ error: `${name} local government already exists.` });

  localGov = new LocalGovernment({ name, code });

  await localGov.save();
  res.json(localGov);
});

router.put('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
  const { error } = validateForUpdate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const localGov = await LocalGovernment.findByIdAndUpdate(
    req.params.id,
    {
      $set: _.pick(req.body, ['name', 'code']),
    },
    { new: true, useFindAndModify: false }
  );
  if (!localGov)
    return res
      .status(404)
      .json({ error: "Local gov't with given ID not found." });

  res.json(localGov);
});

router.delete(
  '/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const localGov = await LocalGovernment.findByIdAndRemove(req.params.id, {
      useFindAndModify: false,
    });
    if (!localGov)
      return res
        .status(404)
        .json({ error: "Local gov't with given ID not found." });

    res.json(localGov);
  }
);

module.exports = router;
