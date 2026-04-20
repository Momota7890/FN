/**
 * 🛠️ ศูนย์รวมการตั้งค่า API
 * เพื่อความสะดวกในการเปลี่ยน IP หรือ Port ในที่เดียว
 */
// ชี้ตรงไปที่ Ngrok (Backend) เพื่อให้เบราว์เซอร์ส่งไฟล์ใหญ่ได้ตรงๆ ไม่ผ่าน Next.js Proxy
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://d9da-2001-fb1-db-f5d8-e557-d75a-2824-319d.ngrok-free.app";

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
