const config = require('config');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { Role } = require('../models/role.model');
const { LocalGovernment } = require('../models/localGovernment.model');

module.exports = async function (req, res, next) {
  const token = req.header('x-auth-token');
  if (!token)
    return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user = decoded;

    const userRole = req.user.role;
    if (!userRole) return res.status(400).json({ error: 'Invalid user role' });
    if (!mongoose.Types.ObjectId.isValid(userRole._id))
      return res.status(404).json({ error: 'Invalid Role ID.' });
    const role = await Role.findById(userRole);
    if (!role) return res.status(400).json({ error: 'Invalid role' });
    req.role = role.name;

    const userLga = req.user.localGovernment;
    if (!userLga) return res.status(400).json({ error: 'Invalid user lga' });

    const localGovernment = await LocalGovernment.findById(userLga);
    if (!localGovernment)
      return res.status(400).json({ error: "Invalid local gov't" });

    req.userLga = userLga;
    next();
  } catch (ex) {
    if (ex instanceof jwt.TokenExpiredError)
      return res.status(599).json({ error: 'Token expired, sign in.' });
    res.status(400).json({ error: 'Invalid token.' });
  }
};
