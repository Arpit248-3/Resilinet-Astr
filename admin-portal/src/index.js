import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

/**
 * TACTICAL COMMAND CENTER - MAIN ENTRY POINT
 * System Version: 4.0 (Global Integration)
 * * This file initializes the React Virtual DOM and handles 
 * top-level performance metrics for the ResiliNet suite.
 */

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("CRITICAL_FAILURE: Root container not found. System cannot initialize.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* App.js acts as the Secure Gatekeeper (Auth + Bootloader).
        Dashboard.js handles the Command Map and Sockets.
        All network calls are dynamically routed via constants.js.
    */}
    <App />
  </React.StrictMode>
);

// --- PERFORMANCE MONITORING ---
// Captures and logs Web Vitals (LCP, FID, CLS) to ensure 
// the Tactical Map and Analytics render within acceptable thresholds.
reportWebVitals((metric) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SYSTEM_METRIC] ${metric.name}:`, metric.value);
  }
});

/**
 * GLOBAL_RESCUE_HANDLER
 * Catches unhandled promise rejections (often caused by dynamic IP mismatches
 * or backend offline status) to prevent total system crashes.
 */
window.addEventListener('unhandledrejection', (event) => {
  console.warn(`[NETWORK_ALERT] Unhandled Handshake Rejection: ${event.reason}`);
});