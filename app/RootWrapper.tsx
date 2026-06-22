"use client";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

export default function RootWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin  = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {/* overflow-x-hidden 컨테이너 — BottomNav 는 이 밖에 렌더
          paddingTop 제거: Header 컴포넌트가 paddingTop:env(safe-area-inset-top) 으로
          직접 Dynamic Island 아래 공간을 처리함 (negative margin 클리핑 방지) */}
      <div
        className="max-w-[430px] mx-auto min-h-dvh bg-gray-100 relative overflow-x-hidden"
      >
        {children}
      </div>
      {/* fixed 포지셔닝이 overflow 컨테이너에 갇히지 않도록 바깥에 배치 */}
      <BottomNav />
    </>
  );
}
