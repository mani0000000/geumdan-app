"use client";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

export default function RootWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin  = pathname?.startsWith("/admin");
  // 글쓰기/수정 페이지에서는 BottomNav 숨김 (키보드 올라올 때 방해)
  const hideNav  = pathname?.startsWith("/community/write") || pathname?.startsWith("/community/edit");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className="max-w-[430px] mx-auto min-h-dvh bg-gray-100 relative overflow-x-hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
}
