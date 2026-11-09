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
  async redirects() {
    return [
      { source: "/products", destination: "/shop", permanent: true },
      {
        source: "/products/:id",
        destination: "/product/:id",
        permanent: true,
      },
      { source: "/categories", destination: "/shop", permanent: true },
      {
        source: "/categories/:id",
        destination: "/collections/:id",
        permanent: true,
      },
      { source: "/track", destination: "/track-order", permanent: true },
    ];
  },
};

export default nextConfig;
