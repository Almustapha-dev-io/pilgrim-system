const express = require('express');
const cors = require('cors');
const error = require('../middleware/error');
const path = require('path');

const auths = require('../routes/auth');
const users = require('../routes/user.routes');
const banks = require('../routes/bank.routes');
const lgas = require('../routes/lga.routes');
const localGovs = require('../routes/localGovernment.routes');
const pilgrims = require('../routes/pilgrim.routes');
const roles = require('../routes/role.routes');
const states = require('../routes/states.routes');
const years = require('../routes/year.routes');
const analytics = require('../routes/analytics.routes');
const seats = require('../routes/seat.routes');
const allocations = require('../routes/allocation.routes');
const excelExports = require('../routes/exportExcel.routes');
const publicApi = require('../routes/public.routes');

module.exports = function (app) {
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	// app.use(express.static(path.join(__dirname, 'public')));
	app.use(
		express.static(
			path.join(__dirname, '..', 'kadunahajj-front', 'dist', 'pilgrim-system')
		)
	);
	app.use(cors());

	app.use('/api/users', users);
	app.use('/api/auths', auths);
	app.use('/api/banks', banks);
	app.use('/api/local-govs', lgas);
	app.use('/api/enrollment-zones', localGovs);
	app.use('/api/pilgrims', pilgrims);
	app.use('/api/roles', roles);
	app.use('/api/states', states);
	app.use('/api/years', years);
	app.use('/api/analytics', analytics);
	app.use('/api/seats', seats);
	app.use('/api/allocations', allocations);
	app.use('/api/excel-exports', excelExports);
	app.use('/api/v1', publicApi);

	app.get('/*', function (req, res) {
		res.sendFile(path.join(__dirname + '/../kadunahajj-front/dist/pilgrim-system/index.html'));
	});

	app.use(error);
};
