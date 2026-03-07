require('dotenv').config();
const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

// Configure multer for handling file uploads (audio recordings from SOSComponent)
const upload = multer({ dest: 'uploads/' });

// --- UTILS & MODELS ---
const { calculatePriority } = require('./utils/priorityEngine');
const SOS = require('./models/SOS');
const Responder = require('./models/Responder');
const SafeZone = require('./models/SafeZone');
const SOSMessage = require('./models/SOSMessage');
const Supply = require('./models/Supply');
const Survivor = require('./models/Survivor');
const crypto = require('crypto');
const { detectDisasterClusters } = require('./utils/clusterDetection');
const { recommendBestResponder } = require('./utils/missionRecommendation');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { 
    cors: { 
        origin: "*", 
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] 
    } 
});

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resilinet')
  .then(() => console.log("✅ Tactical Database Connected"))
  .catch(err => console.error("❌ DB Connection Failed:", err));

// --- SIMULATION DISABLED: BATTERY NOW COMES DIRECTLY FROM MOBILE TELEMETRY ---

// --- ROUTES ---

// 1. Get All Alerts (Enriched with Priority Scores)
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await SOS.find().sort({ timestamp: -1 });
        const enrichedAlerts = alerts.map(alert => ({
            ...alert._doc,
            dynamicScore: calculatePriority(alert, 0)
        }));
        res.json(enrichedAlerts);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 1b. Survivor Login / Registration
app.post('/api/survivor/login', async (req, res) => {
    try {
        const { phone, name } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number required' });
        
        let survivor = await Survivor.findOne({ phone });
        if (!survivor) {
            survivor = await Survivor.create({ phone, name: name || 'Unknown Survivor' });
        }
        
        res.json({ survivorId: survivor._id, phone: survivor.phone });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Submit New SOS or Update Existing Active SOS
// Supports both JSON (from purely text-based SOS) and multipart/form-data (from hardware button SOS with audio)
app.post('/api/sos', upload.single('audio'), async (req, res) => {
    try {
        console.log("SOS received - Body:", JSON.stringify(req.body));
        if (req.file) console.log("SOS received - Audio File Attached:", req.file.originalname);
        console.log("SOS received from:", req.ip);
        const { survivorId, phone, latitude, longitude, category, emergencyType, name, email, heartRate, sector, timestamp, message } = req.body;
        
        const priorityCategory = emergencyType || category || 'General';
        const searchId = survivorId || phone || "Unknown";
        
        // --- NLP PRIORITY CLASSIFICATION ---
        let priority = "Medium";
        const msgLower = (message || "").toLowerCase();
        if (heartRate > 120 || msgLower.includes("child") || msgLower.includes("unconscious") || msgLower.includes("bleeding") || msgLower.includes("heart patient")) {
            priority = "Critical";
        } else if (msgLower.includes("trapped") || msgLower.includes("fire") || msgLower.includes("urgent")) {
            priority = "High";
        }
        
        // --- LOCATION HANDLING ---
        const coords = [parseFloat(longitude) || 0, parseFloat(latitude) || 0];

        // Find existing SOS that isn't resolved
        let existingSOS = await SOS.findOne({ survivorId: searchId, status: { $ne: 'Resolved' } });

        if (existingSOS) {
            existingSOS.location = { type: 'Point', coordinates: coords };
            existingSOS.timestamp = timestamp ? new Date(timestamp) : new Date();
            existingSOS.priority = priority; // Updates priority dynamically based on latest message
            if (heartRate) {
                 existingSOS.heartRate = heartRate;
            }
            await existingSOS.save();
            console.log("SOS updated and saved to DB:", existingSOS._id);
            io.emit('statusUpdate', existingSOS); // Emit location / status refresh
            console.log("SOS update broadcasted via socket:", existingSOS._id);
            return res.status(200).json({ success: true, data: existingSOS, updated: true });
        }

        // --- AUTOMATIC NEAREST RESCUER ASSIGNMENT ---
        let nearestResponder = null;
        try {
            nearestResponder = await Responder.findOne({
                status: 'Available',
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: coords },
                        $maxDistance: 5000 // 5km radius
                    }
                }
            });
        } catch (geoErr) {
            console.log("Geospatial query skipped (no index or no responders):", geoErr.message);
        }

        let initStatus = 'Active';
        let assignedId = null;

        if (nearestResponder) {
            initStatus = 'rescue_assigned';
            assignedId = nearestResponder._id;
            await Responder.findByIdAndUpdate(assignedId, { status: 'Busy' });
            console.log(`Auto-assigned nearest rescuer ${assignedId} to new SOS`);
        }

        // If no active SOS, create brand new
        const newSOS = new SOS({
            survivorId: searchId,
            name: name || "Unknown Citizen",
            email: email || "N/A",
            phone: phone || searchId,
            category: priorityCategory.toUpperCase(),
            message: message || priorityCategory,
            priority: priority,
            heartRate: heartRate || 80,
            location: { type: 'Point', coordinates: coords },
            status: initStatus,
            assignedResponder: assignedId,
            sector: sector || 'Local',
            timestamp: timestamp ? new Date(timestamp) : new Date()
        });

        await newSOS.save();
        console.log("New SOS saved to DB:", newSOS._id, "| Category:", newSOS.category, "| Priority:", newSOS.priority);
        io.emit('new-sos', newSOS); 
        io.emit('newSOS', newSOS); // Support for Rescuer request
        
        // Emit Rescue Assigned Event specifically for the Uber-style flow
        if (assignedId) {
            io.emit('rescueAssigned', { 
                sosId: newSOS._id, 
                responderId: assignedId,
                survivorLocation: newSOS.location,
                emergencyType: newSOS.category,
                priority: newSOS.priority
            });
        }
        
        console.log("New SOS broadcasted via socket to all clients:", newSOS._id);
        res.status(201).json({ success: true, data: newSOS });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Responder Telemetry (Updates location via Simulate.js)
app.patch('/api/responders/:id/location', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const updatedUnit = await Responder.findByIdAndUpdate(
            req.params.id,
            { 
                location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                lastUpdated: new Date()
            },
            { new: true }
        );
        
        const allResponders = await Responder.find();
        io.emit('units-update', allResponders);
        res.json({ success: true, data: updatedUnit });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Tactical Dispatch
app.put('/api/sos/dispatch/:id', async (req, res) => {
    try {
        const { responderId, isExternal } = req.body; 
        const sosId = req.params.id;
        const updateData = { 
            status: isExternal ? 'Handed Over' : 'Dispatched',
            assignedResponder: responderId 
        };
        const updatedSOS = await SOS.findByIdAndUpdate(sosId, updateData, { new: true });
        const unit = await Responder.findByIdAndUpdate(responderId, { status: 'Busy' }, { new: true });
        const allResponders = await Responder.find();
        io.emit('units-update', allResponders);
        res.json({ success: true, data: updatedSOS });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4b. Get SOS Status for Survivor App
app.get('/api/sos/status/:survivorId', async (req, res) => {
    try {
        const sos = await SOS.findOne({ survivorId: req.params.survivorId, status: { $ne: 'Resolved' } }).sort({ timestamp: -1 });
        if (!sos) return res.json({ status: 'No Active SOS', sos: null });

        let statusLabel = 'SOS Sent';
        if (sos.status === 'Resolved') statusLabel = 'Aid Delivered';
        else if (sos.status === 'Dispatched' || sos.status === 'rescue_assigned') statusLabel = 'Responder En Route';
        else if (sos.assignedResponder) statusLabel = 'Rescuer Assigned';

        res.json({ status: statusLabel, sos });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4c. Get Assigned Responder for Survivor App
app.get('/api/sos/assigned/:survivorId', async (req, res) => {
    try {
        const sos = await SOS.findOne({ survivorId: req.params.survivorId, status: { $ne: 'Resolved' } }).sort({ timestamp: -1 });
        if (!sos || !sos.assignedResponder) return res.json(null);

        const responder = await Responder.findById(sos.assignedResponder);
        res.json(responder);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Resolve SOS
app.put('/api/sos/resolve/:id', async (req, res) => {
    try {
        const sos = await SOS.findById(req.params.id);
        if (sos.assignedResponder) {
            await Responder.findByIdAndUpdate(sos.assignedResponder, { status: 'Available' });
        }
        const updatedSOS = await SOS.findByIdAndUpdate(req.params.id, { status: 'Resolved' }, { new: true });
        const allResponders = await Responder.find();
        io.emit('units-update', allResponders);
        io.emit('statusUpdate', updatedSOS); // Add explicit support for Dashboard
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5b. Start Rescue (QR Handshake Support)
app.post('/api/rescue/start', async (req, res) => {
    try {
        const { rescuerId, sosId } = req.body;
        const updatedSOS = await SOS.findByIdAndUpdate(sosId, { 
            status: 'rescue_assigned', 
            assignedResponder: rescuerId 
        }, { new: true });
        
        await Responder.findByIdAndUpdate(rescuerId, { status: 'Busy' });
        
        io.emit('statusUpdate', updatedSOS);
        io.emit('rescueAssigned', { sosId, rescuerId });
        res.json({ success: true, data: updatedSOS });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5c. End Rescue (Supply Delivered via App)
app.post('/api/sos/confirm-delivery', async (req, res) => {
    try {
        const { sosId, rescuerId, items } = req.body;
        const updatedSOS = await SOS.findByIdAndUpdate(sosId, { status: 'Resolved' }, { new: true });
        
        await Responder.findByIdAndUpdate(rescuerId, { status: 'Available' });
        const allResponders = await Responder.find();
        
        // Dispatch real-time events for Maps, Dashboards, and Survivor App Notification
        io.emit('units-update', allResponders);
        io.emit('statusUpdate', updatedSOS);
        io.emit('rescue-complete', { sosId, rescuerId });
        io.emit('supplyDelivered', { sosId, rescuerId, items });
        
        res.json({ success: true, data: updatedSOS });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Get Responders
app.get('/api/responders', async (req, res) => {
    try {
        const list = await Responder.find();
        res.json(list);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6a. Get Nearby Responders
app.get('/api/responders/nearby', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
        
        const responders = await Responder.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [ parseFloat(lng), parseFloat(lat) ] },
                    $maxDistance: 5000 // 5km radius
                }
            }
        });
        res.json(responders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- REALTIME LOCATION TRACKING ---
app.post('/api/location/update', async (req, res) => {
    try {
        const { userId, latitude, longitude, type } = req.body;
        if (type === 'rescuer') {
            await Responder.findByIdAndUpdate(userId, {
                location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                lastUpdated: new Date()
            });
        } else {
            await SOS.findOneAndUpdate(
                { survivorId: userId, status: { $ne: 'Resolved' } },
                { location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] } }
            );
        }
        io.emit('locationUpdate', { userId, latitude, longitude, type });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- OFFLINE SMS PARSER ---
app.post('/api/sms-webhook', async (req, res) => {
    try {
        // e.g. "SOS LAT:12.93 LNG:77.61 MSG:TRAPPED"
        const { text, from } = req.body; 
        const latMatch = text.match(/LAT:([\d\.-]+)/);
        const lngMatch = text.match(/LNG:([\d\.-]+)/);
        const msgMatch = text.match(/MSG:(.*)/);

        if (latMatch && lngMatch) {
            const latitude = parseFloat(latMatch[1]);
            const longitude = parseFloat(lngMatch[1]);
            const message = msgMatch ? msgMatch[1].trim() : "Offline SMS Emergency";

            let priority = "High";
            const msgLower = message.toLowerCase();
            if (msgLower.includes("child") || msgLower.includes("bleeding") || msgLower.includes("unconscious")) priority = "Critical";

            const newSOS = new SOS({
                survivorId: from,
                phone: from,
                category: "SMS_ALERT",
                message: message,
                priority: priority,
                location: { type: 'Point', coordinates: [longitude, latitude] },
                status: 'Active'
            });
            await newSOS.save();
            io.emit('new-sos', newSOS);
            return res.json({ success: true, newSOS });
        }
        res.status(400).json({ error: "Invalid SMS format" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TACTICAL HEATMAPS & CLUSTERS ---
let activeClustersCache = [];
app.get('/api/admin/heatmap-data', async (req, res) => {
    try {
        const sosEvents = await SOS.find({ status: { $ne: 'Resolved' } });
        const responders = await Responder.find({ status: 'Available' });
        
        res.json({
            sosDensity: sosEvents.map(s => [s.location.coordinates[1], s.location.coordinates[0]]),
            responderCoverage: responders.map(r => [r.location.coordinates[1], r.location.coordinates[0]]),
            clusters: activeClustersCache
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// BACKGROUND CLUSTER DETECTOR INTERVAL (Every 15s)
setInterval(async () => {
    try {
        const tenMinsAgo = new Date(Date.now() - 10 * 60000);
        const recentSOS = await SOS.find({ timestamp: { $gte: tenMinsAgo }, status: { $ne: 'Resolved' } });
        
        // Simple clustering: checking pairwise distances
        // (For production, implement DBSCAN or specialized geohashing, using basic grouping for the prompt)
        const clusters = [];
        const processed = new Set();
        
        for (let i = 0; i < recentSOS.length; i++) {
            if (processed.has(recentSOS[i]._id.toString())) continue;
            
            const clusterGroup = [recentSOS[i]];
            processed.add(recentSOS[i]._id.toString());
            
            for (let j = i + 1; j < recentSOS.length; j++) {
                if (processed.has(recentSOS[j]._id.toString())) continue;
                
                // Haversine distance simplification over small ranges
                const a = recentSOS[i].location.coordinates;
                const b = recentSOS[j].location.coordinates;
                // Roughly 1 degree = 111km. 200m = 0.0018 degrees.
                const dist = Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
                
                if (dist < 0.0018) {
                    clusterGroup.push(recentSOS[j]);
                    processed.add(recentSOS[j]._id.toString());
                }
            }
            
            if (clusterGroup.length >= 5) {
                // Determine center point naturally
                const avgLon = clusterGroup.reduce((sum, s) => sum + s.location.coordinates[0], 0) / clusterGroup.length;
                const avgLat = clusterGroup.reduce((sum, s) => sum + s.location.coordinates[1], 0) / clusterGroup.length;
                
                const clusterPayload = {
                    center: [avgLat, avgLon],
                    count: clusterGroup.length,
                    radius: 200, // Fixed physical radius mapping
                    id: `cluster-${Date.now()}`
                };
                clusters.push(clusterPayload);
                io.emit("disasterCluster", clusterPayload);
            }
        }
        activeClustersCache = clusters;
    } catch (err) { console.error("Cluster Engine error", err); }
}, 15000);

// 6b. Get Assigned Responder for Survivor
app.get('/api/sos/assigned/:survivorId', async (req, res) => {
    try {
        const sos = await SOS.findOne({ survivorId: req.params.survivorId, status: { $ne: 'Resolved' } }).sort({ timestamp: -1 });
        if (!sos || !sos.assignedResponder) return res.json(null);
        
        const responder = await Responder.findById(sos.assignedResponder);
        res.json(responder);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6c. Get Rescue Status for Survivor
app.get('/api/sos/status/:survivorId', async (req, res) => {
    try {
        const sos = await SOS.findOne({ survivorId: req.params.survivorId }).sort({ timestamp: -1 });
        if (!sos) return res.json({ status: 'No Active SOS' });
        
        let status = 'SOS Submitted';
        if (sos.status === 'Resolved') status = 'Resolved';
        else if (sos.assignedResponder) {
            const supplies = await Supply.find({ victimId: sos._id });
            const allDelivered = supplies.length > 0 && supplies.every(s => s.status === 'Delivered');
            if (allDelivered) status = 'Aid Delivered';
            else status = 'Responder En Route';
        }
        
        res.json({ status, sos });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. NEW: Get All Safe Zones (For Frontend Icons)
app.get('/api/safe-zones', async (req, res) => {
    try {
        const zones = await SafeZone.find();
        res.json(zones);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 8. Send SOS Message (Multi-Message Support)
app.post('/api/sos-messages', async (req, res) => {
    try {
        const { survivorId, username, message, location } = req.body;
        if (!survivorId || !message) {
            return res.status(400).json({ error: 'survivorId and message are required' });
        }

        // Store the individual message
        const newMsg = await SOSMessage.create({
            survivorId,
            username: username || 'Anonymous',
            message,
            location: location || { type: 'Point', coordinates: [0, 0] }
        });

        // Auto-create SOS record if this is the survivor's first message
        let sos = await SOS.findOne({ survivorId });
        if (!sos) {
            sos = await SOS.create({
                survivorId,
                name: username || 'Anonymous',
                phone: survivorId,
                category: 'General',
                priority: 'Medium',
                location: location || { type: 'Point', coordinates: [0, 0] },
                status: 'Active',
                sector: 'Local'
            });
            io.emit('new-sos', sos);
        }

        io.emit('new-sos-message', { survivorId, message: newMsg });
        
        // Auto-trigger summarization in the background (fire and forget)
        axios.post(`http://localhost:${process.env.PORT || 5000}/api/summarize/${survivorId}`)
            .catch(err => console.error('Auto-summarize failed:', err.message));

        res.status(201).json({ success: true, data: newMsg });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 9. Fetch All Messages for a Survivor
app.get('/api/sos-messages/:survivorId', async (req, res) => {
    try {
        const messages = await SOSMessage.find({ survivorId: req.params.survivorId })
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 10. Ollama Qwen3:14B Summarization
app.post('/api/summarize/:survivorId', async (req, res) => {
    try {
        const { survivorId } = req.params;
        const messages = await SOSMessage.find({ survivorId }).sort({ createdAt: 1 });

        if (messages.length === 0) {
            return res.status(404).json({ error: 'No messages found for this survivor' });
        }

        // Build the message log for the LLM
        const messageLog = messages.map((m, i) =>
            `[${i + 1}] (${new Date(m.createdAt).toLocaleString()}) ${m.username}: ${m.message}`
        ).join('\n');

        const prompt = `You are an emergency response AI. Below are SOS messages from a single survivor. 
Analyze them and:
1. Remove repeated/duplicate information
2. Create a concise summary of the survivor's situation
3. Assign a priority level: Critical, High, Medium, or Low

Messages:
${messageLog}

Respond ONLY in this exact JSON format, no extra text:
{"summary": "...", "priority": "Critical|High|Medium|Low"}`;

        const ollamaRes = await axios.post('http://localhost:11434/api/generate', {
            model: 'qwen3:14b',
            prompt,
            stream: false,
            options: { temperature: 0.3 }
        }, { timeout: 600000 });

        let summary = 'Unable to parse summary';
        let priority = 'Medium';

        try {
            // Extract JSON from response (handle markdown code blocks)
            let responseText = ollamaRes.data.response || '';
            // Strip thinking tags if present
            responseText = responseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                summary = parsed.summary || summary;
                priority = ['Critical', 'High', 'Medium', 'Low'].includes(parsed.priority)
                    ? parsed.priority : priority;
            }
        } catch (parseErr) {
            console.error('Ollama response parse error:', parseErr.message);
        }

        // Update the SOS record with AI-assigned priority AND the summary text
        await SOS.findOneAndUpdate(
            { survivorId },
            { priority, aiSummary: summary },
            { new: true }
        );

        res.json({
            success: true,
            survivorId,
            messageCount: messages.length,
            summary,
            priority
        });
    } catch (err) {
        console.error('Summarization error:', err.message);
        res.status(500).json({ error: 'Summarization failed: ' + err.message });
    }
});

// 11. Admin Heatmap Data (Real Data)
app.get('/api/admin/heatmap-data', async (req, res) => {
    try {
        const { type } = req.query;
        if (type !== 'sos' && type !== 'resources') {
            return res.json([]);
        }

        if (type === 'sos') {
            // Fetch valid SOS records
            const sosRecords = await SOS.find({
                status: { $ne: 'Resolved' },
                "location.coordinates": { $exists: true, $ne: [] }
            }).sort({ timestamp: -1 });

            // Map priority to heat weight
            const heatmapData = sosRecords.map(sos => {
                let weight = 20; // Low
                if (sos.priority === 'Critical') weight = 100;
                else if (sos.priority === 'High') weight = 80;
                else if (sos.priority === 'Medium') weight = 50;

                return {
                    lat: sos.location.coordinates[1],
                    lng: sos.location.coordinates[0],
                    weight: weight
                };
            });
            return res.json(heatmapData);
        }

        if (type === 'resources') {
            // Fetch Responder records
            const responders = await Responder.find({
                "location.coordinates": { $exists: true, $ne: [] }
            });

            // Map resources to heat weight
            const heatmapData = responders.map(r => {
                let weight = 60; // Default weight
                if (r.status === 'Busy') weight = 100; // Highlight active units more
                
                return {
                    lat: r.location.coordinates[1],
                    lng: r.location.coordinates[0],
                    weight: weight
                };
            });
            return res.json(heatmapData);
        }

    } catch (err) {
        console.error('Heatmap API error:', err);
        res.status(500).json({ error: 'Failed to fetch heatmap data' });
    }
});

// 12. Register Responder
app.post('/api/responders/register', async (req, res) => {
    try {
        const { name, type, phone } = req.body;
        const newResponder = await Responder.create({
            name, type, phone,
            status: 'Available',
            batteryLevel: 100,
            location: { type: 'Point', coordinates: [75.8577, 22.7196] } // Default Indore center
        });
        io.emit('units-update', await Responder.find());
        res.status(201).json(newResponder);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 13. Update Responder Status
app.patch('/api/responders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const r = await Responder.findByIdAndUpdate(req.params.id, { status }, { new: true });
        io.emit('units-update', await Responder.find());
        res.json(r);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 14. Update Responder Location & Telemetry
app.patch('/api/responders/:id/location', async (req, res) => {
    try {
        const { latitude, longitude, batteryLevel, timestamp } = req.body;
        
        let updateFields = {
            location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
            lastUpdated: timestamp ? new Date(timestamp) : new Date()
        };
        if (batteryLevel !== undefined) updateFields.batteryLevel = batteryLevel;

        const r = await Responder.findByIdAndUpdate(req.params.id, updateFields, { new: true });
        io.emit('units-update', await Responder.find());
        res.json(r);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 14b. Synchronized Location Update (Rescuers + Survivors)
app.post('/api/location/update', async (req, res) => {
    try {
        const { userId, latitude, longitude, isResponder } = req.body;
        if (isResponder) {
            await Responder.findByIdAndUpdate(userId, {
                location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                lastUpdated: new Date()
            });
            io.emit('units-update', await Responder.find());
        }
        const locationData = { userId, latitude, longitude, isResponder };
        io.emit('locationUpdate', locationData);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 15. Supply Cargo Operations
app.get('/api/supply', async (req, res) => {
    try {
        let query = {};
        if (req.query.responderId) {
            query.responderId = req.query.responderId;
        }
        const list = await Supply.find(query);
        res.json(list);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/supply/:id/status', async (req, res) => {
    try {
        const { status, signature, timestamp, survivorId, sosId } = req.body;
        
        // Cryptographic QR Validation logic
        if (signature) {
            const payload = JSON.stringify({ survivorId, sosId, resourceId: req.params.id, timestamp });
            const expectedSignature = crypto.createHmac('sha256', process.env.QR_SECRET || 'resilinet-tactical-secret').update(payload).digest('hex');
            
            if (signature !== expectedSignature) {
                return res.status(403).json({ error: 'Cryptographic signature invalid or tempered' });
            }
        }
        
        const supply = await Supply.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (status === 'Delivered') {
            io.emit('supply-delivered', supply);
        }
        res.json(supply);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 16. QR Delivery Handshake Confirmation
app.post('/api/sos/confirm-delivery', async (req, res) => {
    try {
        const { sosId, responderId } = req.body;
        
        // 1. Mark SOS as Resolved
        const sos = await SOS.findByIdAndUpdate(sosId, { status: 'Resolved' }, { new: true });
        
        // 2. Mark Responder as Available
        if (responderId) {
            await Responder.findByIdAndUpdate(responderId, { status: 'Available' });
        }
        
        // 3. Optional: Mark any related Supply as Delivered
        await Supply.updateMany({ victimId: sosId }, { status: 'Delivered' });

        io.emit('rescue-complete', { sosId, responderId, sos });
        io.emit('statusUpdate', sos);
        io.emit('units-update', await Responder.find());
        
        res.json({ success: true, message: 'Rescue Handshake Verified.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 17. ML Cluster Detection API
app.get('/api/admin/disaster-clusters', async (req, res) => {
    try {
        const clusters = await detectDisasterClusters();
        res.json(clusters);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 18. AI Recommend Responder API
app.get('/api/ai/recommend-responder/:sosId', async (req, res) => {
    try {
        const recommendation = await recommendBestResponder(req.params.sosId);
        res.json({ recommendation });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    -------------------------------------------
    🛡️  RESILINET BACKEND: OPERATIONAL
    📡 Handshake Port: ${PORT}
    🏠 Safe Zones: INDORE INFRASTRUCTURE LOADED
    -------------------------------------------
    `);
});