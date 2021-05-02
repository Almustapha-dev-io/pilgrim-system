const bcrypt = require('bcryptjs');
const _ = require('lodash');

const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');
const validateObjectId = require('../middleware/validateObjectId');
const { User, validate, validateForUpdate, validatePassword } = require('../models/user.model');
const { Role } = require('../models/role.model');
const { LocalGovernment } = require('../models/localGovernment.model');

const express = require('express');
const router = express.Router();

router.get('/', [auth, superAdmin],  async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await User.countDocuments();

    const users = await User.find()
        .skip((page-1) * pageSize)
        .limit(pageSize)
        .populate('localGovernment', 'name')
        .populate('role', '_id name')
        .sort('-localGovernment.name')
        .select('_id name code');
    
    res.send({ users, totalDocs });
});

router.get('/by-role/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const pageSize = +req.query.pageSize || 5;
    const page = +req.query.page || 1;

    const totalDocs = await User.countDocuments({ role: req.params.id });

    const users = await User.find({ role: req.params.id })
        .skip((page-1) * pageSize)
        .limit(pageSize)
        .sort('name')
        .select('-password -__v')
        .populate('localGovernment', '_id name');

    res.send({ users, totalDocs });
});

router.post('/', [auth, superAdmin], async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { name, email, roleId, localGovernmentId } = req.body;

    const role = await Role.findById(roleId);
    if (!role) return res.status(400).send('Role with given id not found.');

    const localGov = await LocalGovernment.findById(localGovernmentId);
    if (!localGov) return res.status(400).send('Local gov\'t with given id not found.');

    let user;
    user = await User.findOne({ email });
    if (user) return res.status(400).send(`A user with email ${user.email} already exists.`);

    user = await User.findOne({ localGovernment: localGovernmentId, role: roleId });
    if (user) return res.status(400).send(`A user with email ${user.email} has been assigned to the selected local gov\'t.`);

    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash('password', salt);

    user = new User({ name, email, role: roleId, localGovernment: localGovernmentId, password });

    await user.save();
    res.send(_.pick(user, ['_id', 'name', 'email', 'role', 'localGovernment']));
});

router.put('/change-role/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const roleId = req.body.roleId;
    const role = await Role.findById(roleId);
    if (!role) return res.status(400).send('Invalid role');

    const user = await User.findById(req.params.id);
    if (!user) return res.status(400).send('Invalid user');
    
    const existingUser = await User.findOne({ localGovernment: user.localGovernment, role: role._id });
    if (existingUser) {
        console.log(existingUser, user);
        return res.status(400).send(`${existingUser.name} : ${existingUser.email} has already been assigned to this role.`);
    }

    user.role = role._id;
    user = await user.save();

    res.send(user);
});

router.put('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { name, email, localGovernmentId } = req.body;
    let user;

    if (email) {
        user = await User.findOne({ email });
        if (user) {
            if (user._id.toString() !== req.params.id) {
                return res.status(400).send('User with given email already exists.');
            }
        }
    }

    if (localGovernmentId) {
        const localGov = await LocalGovernment.findById(localGovernmentId);
        if (!localGov) return res.status(400).send('Invalid local gov\'t');

        if (localGov.code === '00') return res.status(400).send('Cannot assign user to this local gov\'t.')

        const existingUser = await User.findOne({ localGovernment: localGovernmentId });
        if (existingUser) {
            if (existingUser._id.toString() !== req.params.id) {
                return res.status(400).send(`A user with email ${existingUser.email} has been assigned to the selected local gov\'t.`);
            }
        }
    }
    
    user = await User.findByIdAndUpdate(req.params.id, {
        $set: { name, email, localgovernment: localGovernmentId }
    }, { new: true, useFindAndModify: false });
    if (!user) return res.status(404).send('User with given ID not found.');

    res.send(user);
});

router.put('/reset-password/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('password', salt);

    const user = await User.findByIdAndUpdate(req.params.id, {
        $set: { password: hashed, firstLogin: true }
    }, { new: true, useFindAndModify: false });
    if (!user) return res.status(404).send('User with given ID not found.');

    res.send(user);
});

router.put('/change-password/:id', [auth, validateObjectId], async (req, res) => {
    const { error } = validatePassword(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { password, currentPassword } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User with given ID not found.');

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(400).send('Current password incorrect');
    
    const defaultPassword = 'password';
    if (password.toLowerCase() === defaultPassword) return res.status(400).send('Cannot use default password');

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    user.password = hashed;
    user.firstLogin = false;
    
    user = await user.save();
    
    res.send(user);
});

/* 
router.put('/roles/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const { error } = validateForUpdate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { roleId } = req.body;

    const role = await Role.findById(roleId);
    if (!role) return res.status(400).send('Invalid role ID.');

    const users 

    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User with given ID not found.');

    if (user.role === 'doctor' || user.role === 'labscientist')
        return res.status(400).send('Cannot change role of a doctor/labscientist user.');

    user = await User.findByIdAndUpdate(req.params.id, {
        $set: { role: req.body.role }
    }, { new: true, useFindAndModify: false });
    if (!user) return res.status(404).send('User with given ID not found.');

    res.send(user);
}); */

router.get('/by-email/:email', [auth, superAdmin], async (req, res) => {
    const user = await User.findOne({ email: req.params.email })
        .populate('role', '_id name')
        .populate('localGovernment', '_id name code');
    if (!user) return res.status(404).send('User with given email not found.');

    res.send(user);
});

router.get('/:id', [auth, validateObjectId], async (req, res) => {
    const user = await User.findById(req.params.id)
        .populate('role', '_id name')
        .populate('localGovernment', '_id name code');
    if (!user) return res.status(404).send('User with given ID not found.');

    res.send(user);
});

router.delete('/:id', [auth, superAdmin, validateObjectId], async (req, res) => {
    const user = await User.findByIdAndRemove(req.params.id, { useFindAndModify: false });
    if (!user) return res.status(404).send('User with given ID not found.');

    res.send(user);
});


module.exports = router;