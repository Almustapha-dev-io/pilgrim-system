const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const { Role, validate } = require('../models/role.model');

router.get('/', [auth, superAdmin], async (req, res) => {
  const roles = await Role.find().sort('name').select('_id name');

  res.json(roles);
});

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let role = new Role(req.body);
  role = await role.save();

  res.json(role);
});

router.get('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).send('Role with given ID not found.');

  res.json(role);
});

router.delete(
  '/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const role = await Role.findByIdAndRemove(req.params.id, {
      useFindAndModify: false,
    });
    if (!role) return res.status(404).send('Role with given ID not found.');

    res.json(role);
  }
);

module.exports = router;
