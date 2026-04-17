"use client";
import { usePathname } from "next/navigation";

export default function RootWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-dvh bg-gray-100 relative overflow-x-hidden">
      {children}
    </div>
  );
}
