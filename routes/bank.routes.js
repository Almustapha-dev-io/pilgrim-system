const _ = require('lodash');
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');

const { Bank, validate } = require('../models/bank.model');

/**
 * @swagger
 *  components:
 *      schemas:
 *          Bank:
 *              type: object
 *              required:
 *                  - _id
 *                  - name
 *              properties:
 *                  _id:
 *                      type: string
 *                      description: Banks unique ID
 *                  name:
 *                      type: string
 *                      description: Bank Name
 *              examples:
 *                  _id: 21218321fa
 *                  name: Krama Bank
 */

/**
 * @swagger
 * tags:
 *  name: Banks
 *  description: API for bnaks
 */

/**
 * @swagger
 * /banks/:
 *     get:
 *        summary: Authenticates user
 *        security:
 *             - bearerAuth: []
 *        tags: [Banks]
 *        responses:
 *             "200":
 *                 description: Hello
 *                 content:
 *                      application/json:
 *                          schema:
 *                               $ref: '#components/schemas/Bank'
 */

router.get('/', auth, async (req, res) => {
  const banks = await Bank.find({ active: true })
    .sort('name')
    .select('_id name');

  res.json(banks);
});

router.get('/inactive', auth, async (req, res) => {
  const banks = await Bank.find({ active: false })
    .sort('name')
    .select('_id name');

  res.json(banks);
});

router.get('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
  const bank = await Bank.findById(req.params.id);
  if (!bank) return res.status(404).send('Bank with given ID not found.');

  res.json(bank);
});

router.post('/', [auth, superAdmin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { name } = req.body;

  let bank = await Bank.findOne({ name });
  if (bank) return res.status(400).send(`${name} bank already exists.`);

  bank = new Bank(_.pick(req.body, ['name']));

  await bank.save();

  res.json(bank);
});

router.put('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
  const { error } = validateForUpdate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const bank = await Bank.findByIdAndUpdate(
    req.params.id,
    {
      $set: _.pick(req.body, ['name']),
    },
    { new: true, useFindAndModify: false }
  );
  if (!bank) return res.status(404).send('Bank with given ID not found.');

  res.json(bank);
});

router.put(
  '/activate/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const bank = await Bank.findById(req.params.id);
    if (!bank) return res.status(404).send('Bank with given ID not found.');

    bank.active = true;
    await bank.save();
    res.json(bank);
  }
);

router.put(
  '/deactivate/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const bank = await Bank.findById(req.params.id);
    if (!bank) return res.status(404).send('Bank with given ID not found.');

    bank.active = false;
    await bank.save();
    res.json(bank);
  }
);

router.delete(
  '/:id',
  [auth, superAdmin, validateObjectId],
  async (req, res) => {
    const bank = await Bank.findByIdAndRemove(req.params.id, {
      useFindAndModify: false,
    });
    if (!bank) return res.status(404).send('Bank with given ID not found.');

    res.json(bank);
  }
);

module.exports = router;
