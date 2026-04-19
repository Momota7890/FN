import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "https://d9da-2001-fb1-db-f5d8-e557-d75a-2824-319d.ngrok-free.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${backendUrl}/:path*`, // 👉 โยงไป Backend อ่านค่าจาก env
      },
    ];
  },
};
export default nextConfig;
