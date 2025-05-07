const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['temperature', 'humidity', 'light', 'system']
    },
    severity: {
        type: String,
        required: true,
        enum: ['Alerte d\'information', 'Avertissement ', 'Alerte Critique'],
        default: 'warning'
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'acknowledged', 'resolved'],
        default: 'active'
    },
    value: {
        type: Number,
        required: true
    },
    threshold: {
        min: {
            type: Number
        },
        max: {
            type: Number
        }
    },
    message: {
        type: String,
        required: false
    },
    location: {
        type: String,
        required: true,
        default: 'Poulailler principal'
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    },
    actions: [{
        type: String,
        description: String,
        timestamp: Date,
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    notificationsSent: [{
        type: {
            type: String,
            enum: ['email', 'sms', 'push'],
        },
        timestamp: Date,
        status: String
    }]
}, {
    timestamps: true
});

// Index pour améliorer les performances des requêtes fréquentes
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ type: 1, status: 1 });

// Méthode pour ajouter une action
alertSchema.methods.addAction = async function(action, userId) {
    this.actions.push({
        type: action.type,
        description: action.description,
        timestamp: new Date(),
        performedBy: userId
    });
    return this.save();
};

// Méthode pour acquitter une alerte
alertSchema.methods.acknowledge = async function(userId) {
    this.status = 'acknowledged';
    this.acknowledgedBy = userId;
    this.acknowledgedAt = new Date();
    return this.save();
};

// Méthode pour résoudre une alerte
alertSchema.methods.resolve = async function(userId) {
    this.status = 'resolved';
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    return this.save();
};

// Méthode statique pour trouver les alertes actives
alertSchema.statics.findActive = function() {
    return this.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .populate('acknowledgedBy', 'username')
        .populate('resolvedBy', 'username');
};

// Méthode statique pour trouver les alertes critiques
alertSchema.statics.findCritical = function() {
    return this.find({
        status: 'active',
        severity: 'critical'
    }).sort({ createdAt: -1 });
};

// Méthode pour créer une alerte de température
alertSchema.statics.createTemperatureAlert = async function(value, thresholds) {
    const severity = value > thresholds.max + 5 || value < thresholds.min - 5 ? 'critical' : 'warning';
    const message = value > thresholds.max 
        ? `Température trop élevée: ${value}°C (max: ${thresholds.max}°C)`
        : `Température trop basse: ${value}°C (min: ${thresholds.min}°C)`;

    return this.create({
        type: 'temperature',
        severity,
        value,
        threshold: thresholds,
        message
    });
};

// Méthode pour créer une alerte d'humidité
alertSchema.statics.createHumidityAlert = async function(value, thresholds) {
    const severity = value > thresholds.max + 15 || value < thresholds.min - 15 ? 'critical' : 'warning';
    const message = value > thresholds.max 
        ? `Humidité trop élevée: ${value}% (max: ${thresholds.max}%)`
        : `Humidité trop basse: ${value}% (min: ${thresholds.min}%)`;

    return this.create({
        type: 'humidity',
        severity,
        value,
        threshold: thresholds,
        message
    });
};

// Méthode pour créer une alerte de luminosité
alertSchema.statics.createLightAlert = async function(value, thresholds) {
    const severity = value < thresholds.min / 2 ? 'critical' : 'warning';
    const message = `Niveau de luminosité insuffisant: ${value} lux (min: ${thresholds.min} lux)`;

    return this.create({
        type: 'light',
        severity,
        value,
        threshold: thresholds,
        message
    });
};

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;