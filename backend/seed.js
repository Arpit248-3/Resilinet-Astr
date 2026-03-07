const mongoose = require('mongoose');

// 1. DATABASE CONNECTION (Replace with your actual MongoDB URI)
const MONGO_URI = 'mongodb://localhost:27017/resilinet'; 

// 2. DEFINE SCHEMA (Must match your backend Alert model)
const alertSchema = new mongoose.Schema({
    userId: String,
    name: String,
    phone: String,
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number] // [longitude, latitude]
    },
    category: String,
    status: { type: String, default: 'Active' },
    priorityScore: Number,
    ai_insight: String,
    timestamp: { type: Date, default: Date.now }
});

const Alert = mongoose.model('Alert', alertSchema);

// 3. GENERATION LOGIC
const categories = ['Medical', 'Fire', 'Security', 'Accident'];
const insights = [
    "High probability of structural collapse. Immediate evacuation advised.",
    "Multiple victims detected via audio analysis. Dispatching advanced life support.",
    "Pattern matches previous incidents in this sector. Possible coordinated activity.",
    "Oxygen levels dropping in vicinity. Heavy smoke detected."
];

async function seedDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        // Optional: Clear existing alerts to see a clean "Full" state
        // await Alert.deleteMany({}); 

        const mockAlerts = [];
        const now = new Date();

        for (let i = 0; i < 20; i++) {
            // Randomize dates over the last 7 days
            const randomDaysAgo = Math.floor(Math.random() * 7);
            const timestamp = new Date();
            timestamp.setDate(now.getDate() - randomDaysAgo);

            mockAlerts.push({
                userId: `user_${Math.floor(Math.random() * 1000)}`,
                name: "Mock Victim",
                phone: "911-000-0000",
                location: {
                    type: 'Point',
                    // Random coordinates around Bengaluru [77.59, 12.97]
                    coordinates: [
                        77.5946 + (Math.random() - 0.5) * 0.1, 
                        12.9716 + (Math.random() - 0.5) * 0.1
                    ]
                },
                category: categories[Math.floor(Math.random() * categories.length)],
                status: Math.random() > 0.3 ? 'Resolved' : 'Active',
                priorityScore: Math.random() * 100,
                ai_insight: insights[Math.floor(Math.random() * insights.length)],
                timestamp: timestamp
            });
        }

        await Alert.insertMany(mockAlerts);
        console.log("Successfully seeded 20 mock alerts!");
        process.exit();
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

seedDatabase();