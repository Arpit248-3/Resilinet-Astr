/**
 * TACTICAL NETWORK CONFIGURATION
 * This file dynamically detects the host environment to ensure
 * cross-device compatibility without manual IP reconfiguration.
 */

// Dynamically fetch the current hostname (IP or domain) of the server
const HOST = window.location.hostname; 

// Configuration for Backend Port
const PORT = "5000";

// Base URL Construction
const BASE_URL = `http://${HOST}:${PORT}`;

// --- EXPORTED API ENDPOINTS ---

export const API_BASE = BASE_URL;
export const API_ALERTS = `${BASE_URL}/api/alerts`;
export const API_TRIAGE = `${BASE_URL}/api/trigger-cluster-escalation`;
export const API_DISTRIBUTE = `${BASE_URL}/api/distribute-aid`;

// Analytics Endpoints (Used in Analytics.js)
export const API_ANALYTICS_WEEKLY = `${BASE_URL}/api/analytics/weekly`;
export const API_ANALYTICS_PREDICTIVE = `${BASE_URL}/api/analytics/predictive`;
export const API_DISPATCH_REPORT = `${BASE_URL}/api/dispatch-report`;

// Multi-Message SOS Endpoints
export const API_SOS_MESSAGES = `${BASE_URL}/api/sos-messages`;
export const API_SUMMARIZE = `${BASE_URL}/api/summarize`;

/**
 * UTILITY: SOCKET CONFIGURATION
 * Use this in your socket.io-client initialization
 */
export const SOCKET_URL = BASE_URL;