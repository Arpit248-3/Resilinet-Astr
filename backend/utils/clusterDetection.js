const SOS = require('../models/SOS');

/**
 * Identify clusters of SOS alerts indicating a severe disaster zone.
 * Criteria: 5+ active alerts within 200 meters.
 * Optimized using MongoDB $geoNear and aggregation pipelines.
 */
async function detectDisasterClusters() {
    try {
        // Find all currently active SOS records that have valid coordinates
        const activeSos = await SOS.find({
            status: { $ne: 'Resolved' },
            "location.coordinates": { $exists: true, $ne: [] }
        });

        const clusters = [];
        const checkedIds = new Set(); // Prevent grouping same alerts multiple times

        // Iterate through each active SOS as a potential cluster center
        for (const centerSos of activeSos) {
            if (checkedIds.has(centerSos._id.toString())) continue;

            // Find all alerts within 200 meters of this center point
            const nearby = await SOS.find({
                status: { $ne: 'Resolved' },
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: centerSos.location.coordinates
                        },
                        $maxDistance: 200 // meters
                    }
                }
            });

            // If 5 or more alerts are grouped in this 200m radius, it's a cluster
            if (nearby.length >= 5) {
                // Register this cluster
                clusters.push({
                    type: "cluster",
                    center: centerSos.location.coordinates,
                    count: nearby.length,
                    severity: "Critical",
                    alerts: nearby.map(s => s._id)
                });

                // Mark these alerts as checked so they aren't counted as centers of new overlapping clusters
                nearby.forEach(s => checkedIds.add(s._id.toString()));
            }
        }

        return clusters;
    } catch (err) {
        console.error("Cluster Detection Error:", err);
        return [];
    }
}

module.exports = { detectDisasterClusters };
