import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "localhost:5000",
      "127.0.0.1:5000",
      "via.placeholder.com",
      "placehold.co",
    ],
    unoptimized: true, // Allow unoptimized images from localhost
  },
};

export default nextConfig;
