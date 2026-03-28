import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "검단 라이프 - 검단 신도시 슈퍼앱",
  description: "검단 신도시 주민을 위한 소통, 교통, 부동산, 상가 정보 슈퍼앱",
  keywords: ["검단", "검단 신도시", "인천 서구", "검단 라이프", "검단 커뮤니티"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-gray-100">
        <div className="max-w-[430px] mx-auto min-h-dvh bg-gray-100 relative overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
