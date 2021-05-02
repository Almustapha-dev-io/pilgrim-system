const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    seatNumber: {
        type: Number,
        required: true
    },
    zone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LocalGovernment',
        required: true
    },
    year: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Year',
        required: true
    }
});

const Seat = mongoose.model('Seat', seatSchema);

exports.Seat = Seat;