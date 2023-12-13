const express = require('express');
const excelJs = require('exceljs');
const fs = require('fs');
const path = require('path');

const { Allocation } = require('../models/allocation.model');
const { Pilgrim } = require('../models/pilgrim.model');
const auth = require('../middleware/auth');
const pathHelper = require('../util/path');

const savePath = path.join(pathHelper, '..', 'public', 'temp');

const router = express.Router();

router.get('/pilgrims', async (req, res) => {
  const pilgrims = await Pilgrim.find()
    .populate('personalDetails.stateOfOrigin')
    .populate('personalDetails.localGovOfOrigin');

  const workbook = new excelJs.Workbook();
  const worksheet = workbook.addWorksheet('ALL PILGRIMS');
  worksheet.columns = [
    { header: 'Surname', key: 'personalDetails.surname', width: 10 },
    { header: 'Other Names', key: 'personalDetails.otherNames', width: 10 },
    { header: 'Sex', key: 'personalDetails.sex', width: 10 },
    {
      header: 'Marital Status',
      key: 'personalDetails.maritalStatus',
      width: 10,
    },
    { header: 'Home Address', key: 'personalDetails.homeAddress', width: 10 },
    {
      header: 'State of origin',
      key: 'personalDetails.stateOfOrigin.name',
      width: 10,
    },
    { header: 'LGA', key: 'personalDetails.localGovOfOrigin.name', width: 10 },
    { header: 'DOB', key: 'personalDetails.dateOfBirth', width: 10 },
    { header: 'Phone', key: 'personalDetails.phone', width: 10 },
    { header: 'Email', key: 'personalDetails.email', width: 10 },
    { header: 'Phone II', key: 'personalDetails.alternatePhone', width: 10 },

    { header: 'Occupation', key: 'officeDetails.occupation', width: 10 },
    { header: 'Work Place', key: 'officeDetails.placeOfWork', width: 10 },
    { header: 'Office Address', key: 'officeDetails.officeAddress', width: 10 },
    { header: 'Profession', key: 'officeDetails.profession', width: 10 },

    { header: 'Next of kin', key: 'nextOfKinDetails.fullName', width: 10 },
    {
      header: 'Next of kin relationship',
      key: 'nextOfKinDetails.relationship',
      width: 10,
    },
    {
      header: 'Next of kin address',
      key: 'nextOfKinDetails.address',
      width: 10,
    },
    { header: 'Next of kin phone', key: 'nextOfKinDetails.phone', width: 10 },

    { header: 'Mahrim', key: 'mahrimDetails.fullName', width: 10 },
    {
      header: 'Mahrim relationship',
      key: 'mahrimDetails.relationship',
      width: 10,
    },
    { header: 'Mahrim address', key: 'mahrimDetails.address', width: 10 },
    { header: 'Mahrim phone', key: 'mahrimDetails.phone', width: 10 },

    { header: 'Passport type', key: 'passportDetails.passportType', width: 10 },
    {
      header: 'Passport number',
      key: 'passportDetails.passportNumber',
      width: 10,
    },
    {
      header: 'Passport place of issue',
      key: 'passportDetails.placeOfIssue',
      width: 10,
    },
    {
      header: 'Passport issue date',
      key: 'passportDetails.dateOfIssue',
      width: 10,
    },
    {
      header: 'Passport expiry date',
      key: 'passportDetails.expiryDate',
      width: 10,
    },
    { header: 'Registration date', key: 'dateCreated', width: 10 },
  ];

  const flattened = pilgrims.map((p) => ({
    'personalDetails.maritalStatus': p.personalDetails.maritalStatus,
    'personalDetails.surname': p.personalDetails.surname,
    'personalDetails.otherNames': p.personalDetails.otherNames,
    'personalDetails.sex': p.personalDetails.sex,
    'personalDetails.homeAddress': p.personalDetails.homeAddress,
    'personalDetails.stateOfOrigin.name': p.personalDetails.stateOfOrigin.name,
    'personalDetails.localGovOfOrigin.name':
      p.personalDetails.localGovOfOrigin.name,
    'personalDetails.dateOfBirth': p.personalDetails.dateOfBirth,
    'personalDetails.phone': p.personalDetails.phone,
    'personalDetails.alternatePhone': p.personalDetails.alternatePhone,
    'personalDetails.email': p.personalDetails.email,

    'officeDetails.occupation': p.officeDetails.occupation,
    'officeDetails.placeOfWork': p.officeDetails.placeOfWork,
    'officeDetails.officeAddress': p.officeDetails.officeAddress,
    'officeDetails.profession': p.officeDetails.profession,

    'nextOfKinDetails.fullName': p.nextOfKinDetails.fullName,
    'nextOfKinDetails.address': p.nextOfKinDetails.address,
    'nextOfKinDetails.phone': p.nextOfKinDetails.phone,
    'nextOfKinDetails.relationship': p.nextOfKinDetails.relationship,

    'passportDetails.passportType': p.passportDetails.passportType,
    'passportDetails.passportNumber': p.passportDetails.passportNumber,
    'passportDetails.placeOfIssue': p.passportDetails.placeOfIssue,
    'passportDetails.dateOfIssue': p.passportDetails.dateOfIssue,
    'assportDetails.expiryDate': p.passportDetails.expiryDate,

    'mahrimDetails.fullName': p.mahrimDetails.fullName,
    'mahrimDetails.address': p.mahrimDetails.address,
    'mahrimDetails.phone': p.mahrimDetails.phone,
    'mahrimDetails.relationship': p.mahrimDetails.relationship,
    dateCreated: p.dateCreated,
  }));

  worksheet.addRows(flattened);
  worksheet.getRow(1).eachCell((c) => (c.font = { bold: true }));

  const filename = Math.floor(Math.random() * 100000) + Date.now();
  await workbook.xlsx.writeFile(`${savePath}/${filename}.xlsx`);

  const readStream = fs.createReadStream(`${savePath}/${filename}.xlsx`);
  res.setHeader(
    'Content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  readStream.pipe(res);
});

router.get('/allocations/:type', async (req, res) => {
  const query = { deleted: false };

  if (req.params.type === 'active') query.migrated = false;
  else if (req.params.type === 'migrated') query.migrated = true;
  else if (req.params.type === 'deleted') query.deleted = true;
  else return res.status(400).json({ error: 'Invalid type' });

  const { yearId, zoneId } = req.query;
  if (yearId) query.enrollmentYear = yearId;
  if (zoneId) query.enrollmentZone = zoneId;

  const allocations = await Allocation.find(query)
    .populate('pilgrim')
    .populate('enrollmentZone')
    .populate('enrollmentYear');

  const workbook = new excelJs.Workbook();
  const worksheet = workbook.addWorksheet(
    `ALLOCATIONS - ${req.params.type.toUpperCase()}`
  );
  worksheet.columns = [
    {
      header: 'Pilgrim Surname',
      key: 'pilgrim.personalDetails.surname',
      width: 10,
    },
    {
      header: 'Pilgrim Other Names',
      key: 'pilgrim.personalDetails.otherNames',
      width: 10,
    },
    {
      header: 'Pilgrim Home Address',
      key: 'pilgrim.personalDetails.homeAddress',
      width: 10,
    },
    {
      header: 'Pilgrim DOB',
      key: 'pilgrim.personalDetails.dateOfBirth',
      width: 10,
    },
    {
      header: 'Pilgrim Phone',
      key: 'pilgrim.personalDetails.phone',
      width: 10,
    },
    {
      header: 'Pilgrim Email',
      key: 'pilgrim.personalDetails.email',
      width: 10,
    },
    {
      header: 'Pilgrim Phone II',
      key: 'pilgrim.personalDetails.alternatePhone',
      width: 10,
    },

    {
      header: 'Pilgrim Passport type',
      key: 'pilgrim.passportDetails.passportType',
      width: 10,
    },
    {
      header: 'Pilgrim Passport number',
      key: 'pilgrim.passportDetails.passportNumber',
      width: 10,
    },
    {
      header: 'Pilgrim Passport place of issue',
      key: 'pilgrim.passportDetails.placeOfIssue',
      width: 10,
    },
    {
      header: 'Pilgrim Passport issue date',
      key: 'pilgrim.passportDetails.dateOfIssue',
      width: 10,
    },
    {
      header: 'Pilgrim Passport expiry date',
      key: 'pilgrim.passportDetails.expiryDate',
      width: 10,
    },

    { header: 'Registration number', key: 'code', width: 10 },
    { header: 'Hajj experience', key: 'hajjExperience', width: 10 },
    { header: 'Last Hajj Year', key: 'lastHajjYear', width: 10 },

    { header: 'Registration Center', key: 'enrollmentZone.name', width: 10 },
    { header: 'Hajj Year', key: 'enrollmentYear.year', width: 10 },
    {
      header: 'Allocation Number',
      key: 'enrollmentAllocationNumber',
      width: 10,
    },
    { header: 'Registration date', key: 'createdAt', width: 10 },
  ];

  const flattened = allocations.map((p) => ({
    'pilgrim.personalDetails.surname': p.pilgrim.personalDetails.surname,
    'pilgrim.personalDetails.otherNames': p.pilgrim.personalDetails.otherNames,
    'pilgrim.personalDetails.homeAddress':
      p.pilgrim.personalDetails.homeAddress,
    'pilgrim.personalDetails.dateOfBirth':
      p.pilgrim.personalDetails.dateOfBirth,
    'pilgrim.personalDetails.phone': p.pilgrim.personalDetails.phone,
    'pilgrim.personalDetails.email': p.pilgrim.personalDetails.email,
    'pilgrim.personalDetails.alternatePhone':
      p.pilgrim.personalDetails.alternatePhone,

    'pilgrim.passportDetails.passportType':
      p.pilgrim.passportDetails.passportType,
    'pilgrim.passportDetails.passportNumber':
      p.pilgrim.passportDetails.passportNumber,
    'pilgrim.passportDetails.placeOfIssue':
      p.pilgrim.passportDetails.placeOfIssue,
    'pilgrim.passportDetails.dateOfIssue':
      p.pilgrim.passportDetails.dateOfIssue,
    'pilgrim.passportDetails.expiryDate': p.pilgrim.passportDetails.expiryDate,

    code: p.code,
    hajjExperience: p.hajjExperience,
    lastHajjYear: p.lastHajjYear,
    enrollmentAllocationNumber: p.enrollmentAllocationNumber,
    'enrollmentZone.name': p.enrollmentZone.name,
    'enrollmentYear.year': p.enrollmentYear.year,
    createdAt: p.createdAt,
  }));

  worksheet.addRows(flattened);
  worksheet.getRow(1).eachCell((c) => (c.font = { bold: true }));

  const filename = Math.floor(Math.random() * 100000) + Date.now();
  await workbook.xlsx.writeFile(`${savePath}/${filename}.xlsx`);

  const readStream = fs.createReadStream(`${savePath}/${filename}.xlsx`);
  res.setHeader(
    'Content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  readStream.pipe(res);
});

module.exports = router;
