"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Bus, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/community", label: "소통", icon: Users },
  { href: "/transport", label: "교통", icon: Bus },
  { href: "/stores", label: "상가", icon: Building2 },
  { href: "/mypage", label: "MY", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around h-[58px]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full press-effect",
                isActive ? "text-blue-600" : "text-gray-400"
              )}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={cn(isActive ? "text-blue-600" : "text-gray-400")}
              />
              <span className={cn(
                "text-[10px] font-medium",
                isActive ? "text-blue-600" : "text-gray-400"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
