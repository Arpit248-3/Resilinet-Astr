const mongoose = require('mongoose');

const SafeZoneSchema = new mongoose.Schema({
    id: String, // Matching your JSON ID
    name: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['Hospital', 'Police', 'Shelter'], 
        required: true 
    },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    }
}, { timestamps: true });

SafeZoneSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SafeZone', SafeZoneSchema);