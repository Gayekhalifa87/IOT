const mongoose = require('mongoose');

const lampSchema = new mongoose.Schema({
  userId: { // Ajout du champ userId
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Obligatoire pour lier à un utilisateur
  },
  status: {
    type: Boolean,
    default: false
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)!`
      }
    },
    endTime: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: props => `${props.value} n'est pas un format d'heure valide (HH:MM)!`
      }
    }
  },
  activeDays: {
    type: [String],
    default: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    enum: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  },
  autoMode: {
    enabled: {
      type: Boolean,
      default: false
    },
    lightThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 30
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  linkedSensor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Environmental'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lamp', lampSchema);