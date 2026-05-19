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
    'https://ai.digital-ecosystem.management'
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // pdfjs-dist optionally requires `canvas` for server-side rendering; it
    // ships a native .node binding webpack can't parse. Aliasing to false
    // tells webpack to skip it — pdfjs falls back to its browser path.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
