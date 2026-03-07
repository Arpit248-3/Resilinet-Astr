const mongoose = require('mongoose');

/**
 * RESPONDER SCHEMA v2.0
 * Optimized for real-time tracking, biometric battery monitoring,
 * and Sector-based Mutual Aid logic.
 */
const ResponderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['Police', 'Fire', 'Medical'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Available', 'Busy', 'Offline'], 
        default: 'Available' 
    },
    batteryLevel: { 
        type: Number, 
        default: 100, 
        min: 0, 
        max: 100 
    },
    // SECTOR: Vital for Mutual Aid/Radar logic in Dashboard.js
    sector: { 
        type: String, 
        default: 'Local' 
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
    },
    lastUpdated: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

// 2dsphere index allows for "Near" queries and distance calculations
ResponderSchema.index({ location: "2dsphere" });

// Indexing Sector and Status for fast dashboard filtering
ResponderSchema.index({ sector: 1, status: 1 });

module.exports = mongoose.model('Responder', ResponderSchema);