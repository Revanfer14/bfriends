console.log("✅ next.config.js is loaded by Vercel");

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
