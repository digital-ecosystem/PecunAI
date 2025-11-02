import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  allowedDevOrigins: [
    'http://localhost:4001',
    'https://ai.digital-ecosystem.management'
  ],
};

export default nextConfig;
