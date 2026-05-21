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

      {/* 콘텐츠 영역 */}
      <div className="max-w-[430px] md:max-w-2xl mx-auto lg:mx-0 lg:ml-[220px] lg:max-w-none min-h-dvh bg-gray-100 relative overflow-x-hidden lg:shadow-none shadow-xl">
        {children}
      </div>
    </>
  );
}
