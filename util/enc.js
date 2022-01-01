
const toBase64 = str => Buffer.from(str, 'binary').toString('base64');
const toBinary = str => Buffer.from(str, 'base64').toString('binary');

exports.btoa = toBase64;
exports.atob = toBinary;