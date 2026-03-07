require('dotenv').config();
const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

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

// 2. Submit New SOS
app.post('/api/sos', async (req, res) => {
    try {
        const { phone, latitude, longitude, category, name, email, heartRate, sector } = req.body;
        
        const newSOS = new SOS({
            name: name || "Unknown Citizen",
            email: email || "N/A",
            phone,
            category: (category || 'General').toUpperCase(),
            heartRate: heartRate || 80,
            location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
            status: 'Active',
            sector: sector || 'Local',
            timestamp: new Date()
        });

        newSOS.priority = (newSOS.heartRate > 120) ? "Critical" : "High";

        await newSOS.save();
        io.emit('new-sos', newSOS); 
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

// 5. Resolve SOS
app.put('/api/sos/resolve/:id', async (req, res) => {
    try {
        const sos = await SOS.findById(req.params.id);
        if (sos.assignedResponder) {
            await Responder.findByIdAndUpdate(sos.assignedResponder, { status: 'Available' });
        }
        await SOS.findByIdAndUpdate(req.params.id, { status: 'Resolved' }, { new: true });
        const allResponders = await Responder.find();
        io.emit('units-update', allResponders);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Get Responders
app.get('/api/responders', async (req, res) => {
    try {
        const list = await Responder.find();
        res.json(list);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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