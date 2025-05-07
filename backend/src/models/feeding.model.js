const mongoose = require('mongoose');

const feedingSchema = new mongoose.Schema({
    userId: { // Nouveau champ pour lier l'alimentation à un utilisateur
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    consumedQuantity: {
        type: Number,
        default: 0
    },
    initialQuantity: {
        type: Number,
        required: true
    },
    feedType: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        required: false
    },
    automaticFeeding: {
        type: Boolean,
        default: true
    },
    waterSupply: {
        startTime: {
            type: String,
            required: false
        },
        endTime: {
            type: String,
            required: false
        },
        enabled: {
            type: Boolean,
            default: false
        }
    },
    programStartTime: {
        type: String,
        required: false
    },
    programEndTime: {
        type: String,
        required: false
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feeding', feedingSchema);