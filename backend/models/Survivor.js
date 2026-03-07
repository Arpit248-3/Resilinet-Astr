const mongoose = require('mongoose');

const SurvivorSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: { type: String, default: 'Unknown Survivor' },
    lastLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    },
    createdAt: { type: Date, default: Date.now }
});

SurvivorSchema.index({ lastLocation: "2dsphere" });

module.exports = mongoose.model('Survivor', SurvivorSchema);
