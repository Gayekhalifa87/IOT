const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    userId: { // Nouveau champ pour lier le stock à un utilisateur
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [0, 'La quantité ne peut pas être négative']
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    minQuantity: {
        type: Number,
        required: true,
        min: [0, 'Le seuil d\'alerte ne peut pas être négatif']
    },
    foodTankLevel: {
        type: Number,
        min: [0, 'Le niveau du réservoir de nourriture ne peut pas être négatif'],
        max: [100, 'Le niveau du réservoir de nourriture ne peut pas dépasser 100']
    },
    waterTankLevel: {
        type: Number,
        min: [0, 'Le niveau du réservoir d\'eau ne peut pas être négatif'],
        max: [100, 'Le niveau du réservoir d\'eau ne peut pas dépasser 100']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;