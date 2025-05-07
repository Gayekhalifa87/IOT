const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    userId: { // Ajout explicite du champ userId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Peut être null pour les actions système (ex. cron)
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['environmental', 'feeding', 'vaccine', 'manual', 'production', 'alert', 'maintenance', 'cost', 'notification', 'adjustment', 'stock', 'connexion', 'schedule', 'user', 'security', 'watering', 'arduino']
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    description: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index pour une recherche efficace
historySchema.index({ type: 1, createdAt: -1 });
historySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('History', historySchema);