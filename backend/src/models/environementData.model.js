// models/environmentalData.model.js
const mongoose = require('mongoose');

const environmentalDataSchema = new mongoose.Schema({
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  lightRaw: {
    type: Number,
    required: true
  },
  lightPercentage: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EnvironementData', environmentalDataSchema);