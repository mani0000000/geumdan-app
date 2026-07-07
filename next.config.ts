import type { NextConfig } from "next";

// 빌드 환경(Vercel)에서 서버사이드 env가 비어있으면 createClient 초기화가 실패함.
// 여기서 Node.js process.env에 fallback을 주입해 두면 모든 API 라우트의 모듈 레벨
// createClient 호출이 빌드 타임에도 안전하게 통과한다. (클라이언트 번들에는 포함 안 됨)
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://plwpfnbhyzblgvliiole.supabase.co";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  // 실제 키는 Vercel 환경변수에서 주입됨; 빌드 전용 placeholder
  process.env.SUPABASE_SERVICE_KEY = "build-only-placeholder";
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const isStaticExport = !!basePath;

const nextConfig: NextConfig = {
  ...(isStaticExport && { output: "export" }),
  ...(basePath && { basePath }),
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
