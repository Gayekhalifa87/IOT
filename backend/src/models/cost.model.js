const mongoose = require('mongoose');

const costSchema = new mongoose.Schema({
    userId: { // Nouveau champ pour lier le coût à un utilisateur
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['feed_calculation', 'profitability_calculation', 'other']
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        enum: ['feed', 'medication', 'equipment', 'labor', 'utilities', 'other'],
        default: 'other'
    },
    dynamicData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    profitabilityDetails: {
        numberOfChickens: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        totalCosts: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        profitMargin: { type: Number, default: 0 },
        sales: [{
            quantity: { type: Number, default: 0 },
            unitPrice: { type: Number, default: 0 }
        }]
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: false
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: function() { return this.isRecurring; }
    }
}, {
    timestamps: true
});

// Méthodes statiques et d'instance inchangées
costSchema.statics.setAllowedTypes = function(types) {
    this.schema.path('type').enumValues = types;
};

costSchema.methods.generateDescription = function() {
    let description = this.description;
    if (this.dynamicData) {
        if (this.dynamicData instanceof Map) {
            this.dynamicData.forEach((value, key) => {
                const regex = new RegExp(`{${key}}`, 'g');
                description = description.replace(regex, value);
            });
        } else {
            Object.entries(this.dynamicData).forEach(([key, value]) => {
                const regex = new RegExp(`{${key}}`, 'g');
                description = description.replace(regex, String(value));
            });
        }
    }
    return description;
};

costSchema.methods.calculateMonthlyEquivalent = function() {
    if (!this.isRecurring) return this.amount;
    switch(this.frequency) {
        case 'daily': return this.amount * 30;
        case 'weekly': return this.amount * 4.33;
        case 'monthly': return this.amount;
        case 'yearly': return this.amount / 12;
        default: return this.amount;
    }
};

costSchema.statics.getTotalCostsForBatch = async function(batchId) {
    const costs = await this.find({ batchId });
    return costs.reduce((total, cost) => total + cost.amount, 0);
};

costSchema.statics.calculateBatchProfitability = async function(batchId, totalRevenue) {
    const totalCosts = await this.getTotalCostsForBatch(batchId);
    const profit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    return {
        totalRevenue,
        totalCosts,
        profit,
        profitMargin,
        status: profit > 0 ? 'profitable' : 'loss'
    };
};

module.exports = mongoose.model('Cost', costSchema);