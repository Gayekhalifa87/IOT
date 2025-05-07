const mongoose = require('mongoose');

const passwordChangeTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true
    },
    newPassword: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Le document expirera après 1 heure
    }
});

module.exports = mongoose.model('PasswordChangeToken', passwordChangeTokenSchema);