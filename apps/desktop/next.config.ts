import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  transpilePackages: [
    "@rehab-grid/core",
    "@rehab-grid/ui",
    "@rehab-grid/pages",
  ],
};

export default nextConfig;
