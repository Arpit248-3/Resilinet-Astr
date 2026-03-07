const axios = require('axios');

/**
 * TACTICAL UNIT SIMULATOR v2.3
 * Integrated with Mutual Aid Sectors and Real-time Dashboard Telemetry.
 */

// --- CONFIGURATION ---
const SERVER_URL = 'http://127.0.0.1:5000'; 

// IMPORTANT: Paste an ID from your Responder collection here
const RESPONDER_ID = 'REPLACE_WITH_REAL_ID'; 

// Starting coordinates (Centered on mission area)
let lat = 20.5937;
let lon = 78.9629;

console.log(`
-------------------------------------------
🚀 TACTICAL UNIT SIMULATION: ONLINE
📡 Target Server: ${SERVER_URL}
🆔 Active Unit ID: ${RESPONDER_ID}
-------------------------------------------
`);

/**
 * Simulates tactical movement and updates the central command map
 */
const updateMissionStatus = async () => {
    // 1. Calculate random movement offset (approx 200m per jump)
    lat += (Math.random() - 0.5) * 0.002;
    lon += (Math.random() - 0.5) * 0.002;

    try {
        // PATCH request updates the MongoDB location
        const response = await axios.patch(`${SERVER_URL}/api/responders/${RESPONDER_ID}/location`, {
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6))
        });

        if (response.data.success) {
            console.log(`📍 [TELEMETRY] Lat: ${lat.toFixed(4)} | Lon: ${lon.toFixed(4)} | Status: TRANSMITTING`);
        }
    } catch (err) {
        console.error("❌ [COMMUNICATION_ERROR]: Backend unreachable. Verify server.js is active.");
    }
};

// Update every 3 seconds for optimal smoothness on React Leaflet
const SIM_INTERVAL = setInterval(updateMissionStatus, 3000);

// Graceful shutdown
process.on('SIGINT', () => {
    clearInterval(SIM_INTERVAL);
    console.log("\n🛑 [MISSION HALTED] Unit maintaining last known position.");
    process.exit();
});