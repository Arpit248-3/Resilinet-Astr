const mongoose = require('mongoose');

/**
 * SOS MESSAGE SCHEMA
 * Stores individual messages from survivors.
 * A single survivor (survivorId) can send many messages over time.
 */
const SOSMessageSchema = new mongoose.Schema({
    survivorId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        default: "Anonymous"
    },
    message: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    }
}, { timestamps: true });

// Indexes as per strict requirement
SOSMessageSchema.index({ survivorId: 1 });
SOSMessageSchema.index({ timestamp: -1 });
SOSMessageSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('SOSMessage', SOSMessageSchema);
