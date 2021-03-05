
module.exports.initiator = function (req, res, next) {
    if (req.role !== 'initiator') return res.status(403).send('Access denied. You don\'t have access to this resource.');

    next();
};

module.exports.reviewer = function (req, res, next) {
    if (req.role !== 'reviewer') return res.status(403).send('Access denied. You don\'t have access to this resource.');

    next();
};

module.exports.initiator_admin = function (req, res, next) {
    const roles = ['initiator', 'admin'];

    if (!roles.includes(req.role)) return res.status(403).send('Access denied. You don\'t have access to this resource.');

    next();
};

module.exports.initiator_reviewer = function (req, res, next) {
    const roles = ['initiator', 'reviewer'];

    if (!roles.includes(req.role)) return res.status(403).send('Access denied. You don\'t have access to this resource.');

    next();
};

module.exports.admin_reviewer = function (req, res, next) {
    const roles = ['admin', 'reviewer'];

    if (!roles.includes(req.role)) return res.status(403).send('Access denied. You don\'t have access to this resource.');

    next();
};

module.exports.initiator_reviewer_admin = function (req, res, next) {
    const roles = ['initiator', 'reviewer', 'admin'];

    if (!roles.includes(req.role)) return res.status(403).send('Access denied. You don\'t have access to this resource.');

    next();
};