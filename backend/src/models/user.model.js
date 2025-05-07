// src/models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true 
    },
    code: { 
        type: String
    },
    role: { 
        type: String, 
        enum: ['admin', 'user'], 
        default: 'admin' 
    },
    profilePicture: {
        type: String, // URL ou chemin de la photo de profil
    },

    notificationPreferences: {
        enableEmailReminders: {
          type: Boolean,
          default: true
        },
        reminderDays: {
          type: Number, 
          default: 2,
          min: 1,
          max: 7
        },
        dailySummary: {
          type: Boolean,
          default: false
        },
         // Nouveaux champs pour la réinitialisation de mot de passe
        resetPasswordToken: { 
            type: String 
        },
        resetPasswordExpires: { 
            type: Date 
        }
      },
      isPasswordHashed: {
        type: Boolean,
        default: false // Indique si le mot de passe est déjà hashé
    }
    }, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    if (this.isModified('password') && !this.isPasswordHashed) {
        this.password = await bcrypt.hash(this.password, 8);
        this.isPasswordHashed = true; // Marquer comme hashé après traitement
    }
    next();
});

userSchema.methods.setPasswordWithoutHash = function(password) {
    this.password = password; // Définir directement sans hachage
    this.isPasswordHashed = true; // Indiquer que le mot de passe est déjà hashé
};

module.exports = mongoose.model('User', userSchema);