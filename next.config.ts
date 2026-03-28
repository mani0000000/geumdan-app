import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/geumdan-app",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
