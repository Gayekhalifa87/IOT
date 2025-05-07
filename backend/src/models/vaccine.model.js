const mongoose = require('mongoose');

const vaccineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    dateAdministered: {
        type: Date,
        required: true
    },
    nextDueDate: {
        type: Date
    },
    batchNumber: String,
    numberOfChickens: Number,
    notes: String,
    administered: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    administeredDate: { 
        type: Date 
    },
    weekNumber: { 
        type: Number 
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Vaccine', vaccineSchema);