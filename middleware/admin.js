module.exports = function (req, res, next) {
  if (req.role !== 'admin')
    return res.status(403).json({ error: 'Access denied.' });

  next();
};
