const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
    userId: { // Nouveau champ pour lier la production à un utilisateur
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    chickenCount: {
        type: Number,
        required: true
    },
    mortality: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Production', productionSchema);