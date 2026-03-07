const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Models
const SOS = require('./models/SOS'); 
const Responder = require('./models/Responder');
const Supply = require('./models/Supply');
const SafeZone = require('./models/SafeZone');
const SOSMessage = require('./models/SOSMessage');

/**
 * TACTICAL DATA SEEDER v4.0 (Multi-Message Integrated)
 * Orchestrates: Responders, SOS Alerts, SOSMessages, Supplies, and Indore SafeZones.
 */
mongoose.connect('mongodb://127.0.0.1:27017/resilinet')
  .then(() => console.log("🚀 TACTICAL SEEDING INITIALIZED: Preparing Mission Environment..."))
  .catch(err => console.error("❌ Connection failed", err));

const mockUsers = [
    { name: "Arpit Jham", email: "arpitjham1@gmail.com", phone: "+919876543210", survivorId: "SV-001" },
    { name: "John Doe", email: "john.d@example.com", phone: "+15550102030", survivorId: "SV-002" },
    { name: "Sarah Connor", email: "s.connor@sky.net", phone: "+447700900123", survivorId: "SV-003" },
    { name: "Ravi Kumar", email: "ravi.k@example.com", phone: "+919988776655", survivorId: "SV-004" },
    { name: "Priya Sharma", email: "priya.s@example.com", phone: "+919123456780", survivorId: "SV-005" }
];

const seedData = async () => {
    try {
        // 1. Wipe old mission data to prevent coordinate conflicts
        await SOS.deleteMany({}); 
        await Responder.deleteMany({});
        await Supply.deleteMany({});
        await SafeZone.deleteMany({});
        await SOSMessage.deleteMany({});
        console.log("🧹 DATABASE PURGED: Previous mission data cleared.");

        // 2. Seed Indore Safe Zones from JSON
        const safeZonePath = path.join(__dirname, 'data', 'safeZones.json');
        if (fs.existsSync(safeZonePath)) {
            const rawData = fs.readFileSync(safeZonePath);
            const jsonData = JSON.parse(rawData);

            for (const zone of jsonData) {
                await SafeZone.create({
                    id: zone.id,
                    name: zone.name,
                    type: zone.type,
                    location: { 
                        type: 'Point', 
                        coordinates: [zone.longitude, zone.latitude]
                    }
                });
            }
            console.log(`🏠 ${jsonData.length} Safe Zones established in Indore.`);
        } else {
            console.warn("⚠️ safeZones.json not found in backend/data. Skipping zone seeding.");
        }

        // 3. Seed Responders
        const responders = await Responder.insertMany([
            {
                name: "MEDIC-BRAVO-1",
                type: "Medical",
                batteryLevel: 85,
                sector: "Local",
                status: "Available",
                phone: "+919876543210",
                location: { type: 'Point', coordinates: [75.8900, 22.7500] }
            },
            {
                name: "REGIONAL-AIR-X",
                type: "Medical",
                batteryLevel: 100,
                sector: "Sector-B",
                status: "Available",
                phone: "+15550102030",
                location: { type: 'Point', coordinates: [75.8600, 22.7200] }
            }
        ]);
        console.log(`✅ ${responders.length} Responders Deployed.`);

        // 4. Seed SOS Alerts (with survivorId)
        const activeSOS = [];
        for (let i = 0; i < 5; i++) {
            const user = mockUsers[i];
            const sos = await SOS.create({
                survivorId: user.survivorId,
                name: user.name,
                phone: user.phone,
                category: 'MEDICAL',
                heartRate: 110 + (i * 5),
                priority: i === 0 ? 'Critical' : 'High',
                location: { 
                    type: 'Point', 
                    coordinates: [75.8700 + (i * 0.01), 22.7300 + (i * 0.01)] 
                },
                status: 'Active',
                sector: "Local"
            });
            activeSOS.push(sos);
        }
        console.log("✅ 5 SOS Records generated with survivorIds.");

        // 5. Seed Multi-Message SOS History
        const messageData = [
            // Survivor SV-001 — Arpit (3 messages, building collapse)
            { survivorId: "SV-001", username: "Arpit Jham", message: "Building collapsed near Vijay Nagar! I'm trapped on the 3rd floor. Need help urgently!", location: { type: 'Point', coordinates: [75.8700, 22.7300] } },
            { survivorId: "SV-001", username: "Arpit Jham", message: "I can hear others screaming, there are at least 5 people trapped. My leg is injured and I'm bleeding.", location: { type: 'Point', coordinates: [75.8700, 22.7300] } },
            { survivorId: "SV-001", username: "Arpit Jham", message: "The building is still collapsing. Gas leak smell. We need rescue team IMMEDIATELY. My leg is badly hurt.", location: { type: 'Point', coordinates: [75.8700, 22.7300] } },

            // Survivor SV-002 — John (2 messages, fire)
            { survivorId: "SV-002", username: "John Doe", message: "Fire in the apartment building on MG Road. Smoke is filling the corridors. Can't see anything.", location: { type: 'Point', coordinates: [75.8800, 22.7400] } },
            { survivorId: "SV-002", username: "John Doe", message: "Fire is spreading fast. Stuck on the 5th floor. Elevator not working. Kids are with me. Fire brigade not here yet.", location: { type: 'Point', coordinates: [75.8800, 22.7400] } },

            // Survivor SV-003 — Sarah (3 messages, flood)
            { survivorId: "SV-003", username: "Sarah Connor", message: "Flooding near Rajwada area. Water level rising rapidly. People stranded on rooftops.", location: { type: 'Point', coordinates: [75.8900, 22.7500] } },
            { survivorId: "SV-003", username: "Sarah Connor", message: "Water level now at 4 feet. An elderly couple next door can't move. We need boats.", location: { type: 'Point', coordinates: [75.8900, 22.7500] } },
            { survivorId: "SV-003", username: "Sarah Connor", message: "Power lines are submerged. Extremely dangerous. Water still rising. Need evacuation for 15+ people.", location: { type: 'Point', coordinates: [75.8900, 22.7500] } },

            // Survivor SV-004 — Ravi (2 messages, medical)
            { survivorId: "SV-004", username: "Ravi Kumar", message: "My father collapsed at home. He's having chest pains and difficulty breathing. Need ambulance!", location: { type: 'Point', coordinates: [75.9000, 22.7600] } },
            { survivorId: "SV-004", username: "Ravi Kumar", message: "He's becoming unresponsive. Heart rate very irregular. We're at Bhawarkua area. Please hurry!", location: { type: 'Point', coordinates: [75.9000, 22.7600] } },

            // Survivor SV-005 — Priya (2 messages, accident)
            { survivorId: "SV-005", username: "Priya Sharma", message: "Major road accident on AB Road. Multiple vehicles involved. At least 3 people unconscious.", location: { type: 'Point', coordinates: [75.9100, 22.7700] } },
            { survivorId: "SV-005", username: "Priya Sharma", message: "Traffic is completely blocked. One car is leaking fuel. We need fire and ambulance both.", location: { type: 'Point', coordinates: [75.9100, 22.7700] } },
        ];

        await SOSMessage.insertMany(messageData);
        console.log(`💬 ${messageData.length} SOS Messages seeded across 5 survivors.`);

        // 6. Seed Mock Supply Requests
        await Supply.create([
            {
                victimId: activeSOS[0]._id,
                responderId: responders[0]._id,
                supplyType: "Blood Plasma & IV Kit",
                status: "In-Transit",
                verificationMethod: "QR",
                handshakeId: "TX-ALPHA-99",
                timestamp: new Date()
            },
            {
                victimId: activeSOS[1]._id,
                responderId: responders[1]._id,
                supplyType: "Ration Pack - 48hr",
                status: "Pending",
                verificationMethod: "BIOMETRIC",
                handshakeId: "TX-BETA-101",
                timestamp: new Date()
            }
        ]);
        console.log("📦 Supply Handshakes seeded.");

    } catch (err) {
        console.error("❌ SEEDING FAILED:", err.message);
    } finally {
        console.log("🔌 MISSION COMPLETE: Closing database stream...");
        mongoose.connection.close();
    }
};

seedData();