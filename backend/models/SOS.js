const mongoose = require('mongoose');

/**
 * SOS ALERT SCHEMA v2.0
 * Optimized for Biometric Triage, Geospatial Analytics, 
 * and Mutual Aid Sector Handovers.
 */
const SOSSchema = new mongoose.Schema({
    survivorId: {
        type: String,
        required: true
    },
    name: { 
        type: String, 
        default: "Anonymous User" 
    },
    email: { 
        type: String, 
        default: "Not Provided" 
    },
    phone: { 
        type: String, 
        required: true 
    },
    // Expanded categories to match PriorityEngine.js
    category: { 
        type: String, 
        enum: ['FIRE', 'MEDICAL', 'POLICE', 'ACCIDENT', 'FLOOD', 'EARTHQUAKE', 'RESCUE', 'GENERAL', 'SMS_ALERT', 'General'], 
        default: 'General' 
    },
    priority: { 
        type: String, 
        enum: ['Critical', 'High', 'Medium', 'Low'], 
        default: 'Medium' 
    },
    // CACHED OLLAMA SUMMARY
    aiSummary: {
        type: String,
        default: null
    },
    // BIOMETRIC DATA: Triggers the "Danger Zone" animations in Dashboard.js
    heartRate: { 
        type: Number, 
        default: 75 
    },
    // SECTOR: Essential for Mutual Aid filtering
    sector: { 
        type: String, 
        default: 'Local' 
    },
    // Survivor message text for NLP triage
    message: {
        type: String,
        default: ''
    },
    status: { 
        type: String, 
        enum: ['Active', 'Dispatched', 'Handed Over', 'rescue_assigned', 'Resolved'], 
        default: 'Active' 
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
    assignedResponder: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Responder', 
        default: null 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

// 2dsphere index for proximity alerts and cluster heatmaps
SOSSchema.index({ location: '2dsphere' });
SOSSchema.index({ survivorId: 1 });
SOSSchema.index({ timestamp: -1 });

// Compound index for high-speed filtering in the Alerts Sidebar
SOSSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model('SOS', SOSSchema);