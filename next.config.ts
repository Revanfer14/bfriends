console.log("✅ next.config.ts is loaded by Vercel");

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
        port: "",
      },
      {
        hostname: "u3ttlknavg.ufs.sh",
        port: "",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
