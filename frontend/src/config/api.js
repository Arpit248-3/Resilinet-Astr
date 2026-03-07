/**
 * RESILINET SURVIVOR APP — API CONFIGURATION
 * Uses EXPO_PUBLIC_API_URL env var for cross-device compatibility.
 * Set your PC's LAN IP in frontend/.env
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.145.236:5000";

export const API_URL = `${API_BASE_URL}/api`;

export const SOCKET_URL = API_BASE_URL;

export const SECRET_KEY = 'resilinet-tactical-secret';
