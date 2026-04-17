import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "https://d9da-2001-fb1-db-f5d8-e557-d75a-2824-319d.ngrok-free.app/:path*", // 👉 โยงไป Backend 
      },
    ];
  },
};
export default nextConfig;
