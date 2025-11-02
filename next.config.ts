import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  allowedDevOrigins: [
    'probable-kiwi-peaceful.ngrok-free.app',
    'localhost:4001',
    'ai.digital-ecosystem.management'
  ],
};

export default nextConfig;
