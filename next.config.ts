import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const isStaticExport = !!basePath;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "172.30.1.40"],
  ...(isStaticExport && { output: "export" }),
  ...(basePath && { basePath }),
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "6ptotvmi5753.edge.naverncp.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "www.incheonutd.com" },
    ],
  },
  // WKWebView 캐시 문제 방지 — HTML 페이지는 항상 최신 버전 로드
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
