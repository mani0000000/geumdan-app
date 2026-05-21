"use client";
import { usePathname } from "next/navigation";

// 목록/그리드 위주 라우트는 태블릿·PC에서 폭을 넓혀 공간을 활용한다.
// 그 외(홈·마이·폼 등)는 모바일 앱처럼 좁은 폭으로 화면 중앙에 고정한다.
const WIDE_PREFIXES = ["/stores", "/community", "/real-estate"];

export default function RootWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  const isWide = WIDE_PREFIXES.some((p) => pathname?.startsWith(p));

  const widthClass = isWide
    ? "max-w-[430px] md:max-w-3xl lg:max-w-5xl"
    : "max-w-[430px] md:max-w-md";

  return (
    <div
      className={`${widthClass} mx-auto min-h-dvh bg-gray-100 relative overflow-x-hidden lg:shadow-xl`}
    >
      {children}
    </div>
  );
}
