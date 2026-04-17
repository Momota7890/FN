/**
 * 🛠️ ศูนย์รวมการตั้งค่า API
 * เพื่อความสะดวกในการเปลี่ยน IP หรือ Port ในที่เดียว
 */
const API_BASE_URL = "/api/proxy"; // ส่งไปที่ Next.js Server เพื่อเลี่ยง CORS ปกติ 

export const API_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  EVENTS: `${API_BASE_URL}/api/events`,
  STATS: `${API_BASE_URL}/api/stats`,
  OFFER: `${API_BASE_URL}/offer`,
  PROCESS_IMAGE: `${API_BASE_URL}/process-image`,
  PROCESS_VIDEO: `${API_BASE_URL}/process-video`,
  STATIC_VIDEOS: `${API_BASE_URL}/temp_videos`,
};

/**
 * 🌐 apiFetch — wrapper สำหรับ fetch() ที่ bypass ngrok browser warning อัตโนมัติ
 * ใช้แทน fetch() ทุกที่ที่เรียก API ของ backend
 */
export const apiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(url, {
    ...options,
    headers: {
      "ngrok-skip-browser-warning": "skip",
      ...(options.headers ?? {}),
    },
  });
};

export default API_BASE_URL;
