const bcrypt = require('bcryptjs');
const Joi = require('joi');
const _ = require('lodash');
const { User } = require('../models/user.model');
const express = require('express');
const router = express.Router();

/**
 * @swagger
 *  components:
 *      schemas:
 *          Auth:
 *              type: object
 *              required:
 *                  - email
 *                  - password
 *              properties:
 *                  email:
 *                      type: string
 *                      description: The user's email
 *                  password:
 *                      type: string
 *                      description: This is user's password
 *              examples:
 *                  email: almustaphamuha98@gmail.com
 *                  password: password1
 */

/**
 * @swagger
 * tags:
 *  name: Auths
 *  description: API for user authentication
 */

/**
 * @swagger
 * /auths/:
 *     post:
 *        summary: Authenticates user
 *        tags: [Auths]
 *        requestBody:
 *             required: true
 *             content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#components/schemas/Auth'
 *        responses:
 *             "200":
 *                 description: Hello
 *                 content:
 *                      application/json:
 *                          schema:
 *                               $ref: '#components/schemas/Auth'
 */
router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate('role', '_id name');
  if (!user)
    return res.status(400).json({ error: 'Invalid email or password.' });

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword)
    return res.status(400).json({ error: 'Invalid email or password' });

  const token = user.generateAuthToken();

  user.password = undefined;
  user.__v = undefined;
  user.dateCreated = undefined;

  res.json({ token, user });
});

function validate(user) {
  const schema = {
    email: Joi.string().min(5).max(50).required().email(),
    password: Joi.string().min(5).max(1023).required(),
  };

  return Joi.validate(user, schema);
}

module.exports = router;
