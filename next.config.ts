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
    // pdfjs-dist ships its own canvas (a native .node addon) for server-side rendering.
    // We never render PDFs server-side, so map any require('canvas') to false
    // on both server and client bundles to stop webpack trying to parse the binary.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
