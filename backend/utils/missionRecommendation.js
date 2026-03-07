const Responder = require('../models/Responder');
const SOS = require('../models/SOS');

/**
 * Calculates straight-line geographic distance between two [lng, lat] points using the Haversine formula
 */
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius of the earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in meters
}

/**
 * Recommend the best available responder for a specific SOS.
 * Prioritizes matching type, Available status, and lowest physical distance.
 */
async function recommendBestResponder(sosId) {
    try {
        const sos = await SOS.findById(sosId);
        if (!sos) throw new Error("SOS not found");

        const targetCoords = sos.location.coordinates; // [lng, lat]

        // 1. Find all 'Available' responders
        // In a real production system, use $near aggregation. We fetch available here
        // and do JavaScript proximity for complex weighting (type + battery).
        const responders = await Responder.find({
            status: 'Available',
            "location.coordinates": { $exists: true, $ne: [] }
        });

        if (responders.length === 0) return null;

        let bestMatch = null;
        let lowestScore = Infinity; // Lower score is better

        responders.forEach(r => {
            const distMeters = getDistanceFromLatLonInMeters(
                targetCoords[1], targetCoords[0],
                r.location.coordinates[1], r.location.coordinates[0]
            );

            // Base score is distance in meters
            let score = distMeters;

            // Penalty if Responder Type doesn't exactly match SOS Category
            // Medical -> MEDICAL, Fire -> FIRE, Police -> POLICE
            if (r.type.toUpperCase() !== sos.category.toUpperCase()) {
                score += 5000; // 5km penalty for mismatch
            }

            // Penalty for low battery
            if (r.batteryLevel < 20) {
                score += 2000; // 2km virtual penalty for low battery
            }

            if (score < lowestScore) {
                lowestScore = score;
                bestMatch = {
                    responder: r,
                    distanceMeters: Math.round(distMeters),
                    estimatedETA: Math.ceil((distMeters / 1000) / 40 * 60) // Rough ETA assuming 40km/h avg speed city
                };
            }
        });

        return bestMatch; // Returns { responder, distanceMeters, estimatedETA }
    } catch (err) {
        console.error("Mission Recommendation Error:", err);
        return null;
    }
}

module.exports = { recommendBestResponder };
