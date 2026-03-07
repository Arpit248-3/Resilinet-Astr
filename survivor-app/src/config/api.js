const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.145.236:5000";

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
export default API_BASE_URL;
