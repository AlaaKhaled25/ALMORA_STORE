import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Keep firebase-admin out of the webpack bundle. It needs Node built-ins
  // (stream, worker_threads), and bundling it can break server startup.
  serverExternalPackages: ["firebase-admin"],
  // Allow next/image to load product images from Cloudinary.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
