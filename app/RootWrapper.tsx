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
      {/* overflow-x-hidden 컨테이너 — BottomNav 는 이 밖에 렌더 */}
      <div
        className="max-w-[430px] mx-auto min-h-dvh bg-gray-100 relative overflow-x-hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {children}
      </div>
      {/* fixed 포지셔닝이 overflow 컨테이너에 갇히지 않도록 바깥에 배치 */}
      <BottomNav />
    </>
  );
}
