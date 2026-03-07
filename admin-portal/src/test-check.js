/**
 * RESILINET PRE-FLIGHT SYSTEM CHECK
 * Validates Backend API Reachability and Socket.io Handshake.
 * Use this to verify the Dynamic IP connection before launching the Dashboard.
 */

const { io } = require("socket.io-client");
const axios = require("axios");

// In a real environment, this would import from your constants.js
const BACKEND_URL = "http://127.0.0.1:5000"; 

console.log("🛡️  INITIALIZING RESILINET SYSTEM CHECK...");
console.log(`📡 Target Backend: ${BACKEND_URL}`);

async function runSystemCheck() {
  let apiPassed = false;
  let socketPassed = false;

  // 1. Validate REST API Reachability
  try {
    console.log("\n[1/2] Testing API Reachability...");
    const response = await axios.get(`${BACKEND_URL}/api/alerts`);
    if (response.status === 200) {
      console.log("✅ API SUCCESS: Alerts endpoint reachable.");
      apiPassed = true;
    }
  } catch (error) {
    console.error("❌ API FAILURE: Could not connect to backend. Ensure the server is running on port 5000.");
  }

  // 2. Validate Socket.io Handshake
  console.log("\n[2/2] Testing Socket.io Handshake...");
  const socket = io(BACKEND_URL, {
    reconnectionAttempts: 3,
    timeout: 5000
  });

  socket.on("connect", () => {
    console.log("✅ SOCKET SUCCESS: Tactical real-time link established.");
    socketPassed = true;
    finalize();
  });

  socket.on("connect_error", (err) => {
    console.error(`❌ SOCKET FAILURE: ${err.message}`);
    finalize();
  });

  // Timeout fallback
  setTimeout(() => {
    if (!socketPassed) {
      console.error("❌ SOCKET TIMEOUT: Handshake took too long.");
      finalize();
    }
  }, 6000);

  function finalize() {
    socket.disconnect();
    console.log("\n--- FINAL REPORT ---");
    if (apiPassed && socketPassed) {
      console.log("🚀 SYSTEM READY: All tactical links are active.");
      process.exit(0);
    } else {
      console.log("⚠️  SYSTEM CRITICAL: Fix connection issues before deployment.");
      process.exit(1);
    }
  }
}

runSystemCheck();