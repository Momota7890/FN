import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ไม่ต้องใช้ rewrites แล้วเพื่อแก้ปัญหาอัปโหลดไฟล์วิดีโอใหญ่ทะลุ Next.js proxyไม่ได้
};
export default nextConfig;
