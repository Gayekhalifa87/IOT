// src/models/environmental.model.js
const mongoose = require('mongoose');

const environmentalSchema = new mongoose.Schema({
    temperature: {
        type: Number,
        required: true
    },
    humidity: {
        type: Number,
        required: true
    },
    lightLevel: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Environmental', environmentalSchema);