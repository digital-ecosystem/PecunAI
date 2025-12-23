import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  allowedDevOrigins: [
    'https://probable-kiwi-peaceful.ngrok-free.app',
    'localhost:3000',
    'probable-kiwi-peaceful.ngrok-free.app',
    'localhost:4001',
    'ai.digital-ecosystem.management',
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
