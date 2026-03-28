"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Bus, Building2, User } from "lucide-react";

const navItems = [
  { href: "/geumdan-app/home/", label: "홈", icon: Home, match: "/home" },
  { href: "/geumdan-app/community/", label: "소통", icon: Users, match: "/community" },
  { href: "/geumdan-app/transport/", label: "교통", icon: Bus, match: "/transport" },
  { href: "/geumdan-app/stores/", label: "상가", icon: Building2, match: "/stores" },
  { href: "/geumdan-app/mypage/", label: "MY", icon: User, match: "/mypage" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#E5E8EB] z-50">
      <div className="flex h-[58px]">
        {navItems.map(({ href, label, icon: Icon, match }) => {
          const active = pathname.includes(match);
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 active:opacity-60 transition-opacity">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8}
                className={active ? "text-[#3182F6]" : "text-[#B0B8C1]"} />
              <span className={`text-[10px] font-medium ${active ? "text-[#3182F6]" : "text-[#B0B8C1]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
