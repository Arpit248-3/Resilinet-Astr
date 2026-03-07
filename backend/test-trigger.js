const axios = require('axios');

/**
 * TACTICAL EVENT TRIGGER v2.2
 * Orchestrates SOS injection with scenario-based biometric signatures.
 */

const SERVER_URL = 'http://127.0.0.1:5000';

const triggerTest = async (scenario = 'CRITICAL') => {
    
    const scenarios = {
        CRITICAL: {
            name: "BIO-STRESS TEST (CRITICAL)",
            category: "MEDICAL",
            heartRate: 145, // Triggers 'Critical' priority and red glow
            lat: 20.6100,
            lon: 78.9700
        },
        HIGH: {
            name: "URGENT SECURITY ALERT",
            category: "POLICE",
            heartRate: 110,
            lat: 20.6200,
            lon: 78.9800
        },
        STANDARD: {
            name: "ROUTINE ASSISTANCE",
            category: "GENERAL",
            heartRate: 72,
            lat: 20.5800,
            lon: 78.9500
        }
    };

    const config = scenarios[scenario] || scenarios.STANDARD;

    const testPayload = {
        name: config.name,
        phone: "+919876543210",
        latitude: config.lat,
        longitude: config.lon,
        category: config.category,
        email: "triage-test@resilinet.org",
        heartRate: config.heartRate,
        sector: "Local"
    };

    try {
        console.log(`📡 Injecting Scenario [${scenario}] to ${SERVER_URL}...`);
        
        const response = await axios.post(`${SERVER_URL}/api/sos`, testPayload);
        const { priority, _id, dynamicScore } = response.data.data;
        
        console.log("-------------------------------------------");
        console.log("✅ TACTICAL SOS INJECTED");
        console.log(`🆔 ID: ${_id}`);
        console.log(`⚠️  AUTO-TRIAGE PRIORITY: ${priority}`);
        console.log(`💓 BIOMETRIC SIGNATURE: ${testPayload.heartRate} BPM`);
        console.log("-------------------------------------------");
        
        // Dynamic Feedback for the Developer
        if (testPayload.heartRate > 120) {
            console.log("🔥 UI ACTION: Marker should be PULSING RED (Danger Zone).");
        } else if (priority === 'High') {
            console.log("⚡ UI ACTION: Marker should be YELLOW/ORANGE (Urgent).");
        } else {
            console.log("🟢 UI ACTION: Marker should be STANDARD BLUE/GREEN.");
        }
        
    } catch (error) {
        console.error("❌ TRIGGER FAILED:", error.response ? error.response.data : error.message);
    }
};

// Toggle as needed: 'CRITICAL', 'HIGH', or 'STANDARD'
triggerTest('CRITICAL');