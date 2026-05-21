"use client";
import { usePathname } from "next/navigation";
import SideNav from "@/components/layout/SideNav";

export default function RootWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {/* 데스크탑 사이드 네비 (lg+) */}
      <SideNav />

      {/* 콘텐츠 영역 — 모바일/태블릿/PC 모두 풀 width */}
      <div className="lg:ml-[220px] min-h-dvh bg-[#f5f5f7] overflow-x-hidden">
        {children}
      </div>
    </>
  );
}
