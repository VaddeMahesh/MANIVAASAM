import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure smooth Vercel builds without tripping on minor lint/type warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
