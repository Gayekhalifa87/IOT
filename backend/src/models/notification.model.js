const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['low_stock', 'feeding_reminder', 'stock_added', 'stock_updated', 'stock_deleted', 'custom'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    dynamicData: {
        type: Map,
        of: String
    }
});

notificationSchema.methods.generateMessage = function() {
    let message = this.message;

    if (this.dynamicData) {
        this.dynamicData.forEach((value, key) => {
            const regex = new RegExp(`{${key}}`, 'g');
            message = message.replace(regex, value);
        });
    }

    return message;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;