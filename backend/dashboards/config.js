// dashboards/config.js
// This script automatically detects the server IP based on the browser URL

// window.location.hostname grabs the IP of your laptop from the browser bar
const SERVER_IP = "172.16.14.31"; 

// Dynamic URLs that point to your Node.js backend on port 5000
const API_URL = `http://${SERVER_IP}:5000/api/alerts`;
const CLEAR_URL = `http://${SERVER_IP}:5000/api/clear-alerts`;

console.log("------------------------------------------");
console.log("🛰️ ResiliNet Config Loaded");
console.log("🔗 Backend Target: " + API_URL);
console.log("------------------------------------------");