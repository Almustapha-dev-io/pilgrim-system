
module.exports = function (req, res, next) {
    if (req.role !== 'super-admin') return res.status(403).send('Access denied.');

    next();
}