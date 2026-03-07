🛡️ ResiliNet: Tactical Command Suite (v2.0)
ResiliNet is a high-performance emergency response dashboard. It features a dynamic-IP backend handshake, real-time biometric monitoring (Danger Zones), and AI-driven resource allocation (Mutual Aid).

🚀 Quick Start Guide
1. Prerequisites
Ensure you have the following installed:

Node.js (v16.x or higher)

npm or yarn

Backend Server (Running on port 5000)

2. Installation
Clone the repository and install the tactical dependencies, including the canvas mock required for our test suite:

Bash
npm install
npm install --save-dev jest-canvas-mock
3. Dynamic IP Configuration
This system uses an automated handshake to find your backend, whether on localhost or a local network.

Open src/constants.js.

The system will automatically detect if you are in a production or development environment and route API calls to the correct IP address.

4. Launching the System
Bash
npm start
The dashboard will initialize the Neural Network Background and begin the Socket.io Handshake with the Tactical Dispatch server.

🛠️ Key System Components
🛰️ Command Map (Dashboard.js)
Biometric Alerts: Automatically triggers a danger-zone-glow animation if a citizen's heart rate exceeds 120 BPM.

Mutual Aid: When local units are depleted, the system activates "Mutual Aid" mode, bringing in external units from neighboring sectors.

Sector Handover: Encrypted data transfer tool to move an alert from local control to an external regional unit.

🧠 System Intelligence (Analytics.js)
Efficiency Tracking: Compares AI-driven dispatch times against manual historical averages.

PDF Export: Generates a tactical intelligence report using html2canvas and jsPDF.

🧪 Stability & Testing (setupTests.js)
The testing environment is pre-configured to handle tactical visualizations:

Canvas Mocks: Supports the Neural Network background and Recharts.

Observer Mocks: Handles layout calculations for the Map and Sidebar.

Linting: Optimized for Zero Problems—no useless constructors or unused variables.

🎨 UI & Aesthetics
The UI is governed by a "Tactical Dark" theme defined in App.css and index.css. Key classes include:

.danger-zone-glow: Red pulsing border for critical medical alerts.

.neon-line-animate: Glowing trajectory paths between units and citizens.

.radar-ring-animate: Pulsing range indicators for Mutual Aid units.

⚠️ Troubleshooting
White Flash on Load: Ensure index.css has background-color: #06070a set on the body to prevent visual lag.

Map Not Loading: Check the console for [NETWORK_ALERT]. This indicates the dynamic IP handshake in constants.js could not find the backend server.

Test Failures: Ensure jest-canvas-mock is installed, as the tactical UI relies on canvas rendering for background effects.