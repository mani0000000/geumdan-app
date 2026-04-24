import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const isStaticExport = !!basePath;

const nextConfig: NextConfig = {
  ...(isStaticExport && { output: "export" }),
  ...(basePath && { basePath }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
