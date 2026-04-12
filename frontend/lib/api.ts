/**
 * 🛠️ ศูนย์รวมการตั้งค่า API
 * เพื่อความสะดวกในการเปลี่ยน IP หรือ Port ในที่เดียว
 */
const API_BASE_URL = "http://127.0.0.1:8000";

export const API_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  EVENTS: `${API_BASE_URL}/api/events`,
  OFFER: `${API_BASE_URL}/offer`,
  PROCESS_IMAGE: `${API_BASE_URL}/process-image`,
  PROCESS_VIDEO: `${API_BASE_URL}/process-video`,
  STATIC_VIDEOS: `${API_BASE_URL}/temp_videos`,
};

export default API_BASE_URL;
