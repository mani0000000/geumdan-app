"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Rss, Bus, Building2, User } from "lucide-react";

const navItems = [
  { href: "/home", label: "홈", icon: Home, match: "/home" },
  { href: "/stores", label: "상가", icon: Building2, match: "/stores" },
  { href: "/transport", label: "여행/교통", icon: Bus, match: "/transport" },
  { href: "/community", label: "소식", icon: Rss, match: ["/community", "/news", "/real-estate"] },
  { href: "/mypage", label: "MY", icon: User, match: "/mypage" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#d2d2d7] z-50">
      <div className="flex h-[58px]">
        {navItems.map(({ href, label, icon: Icon, match }) => {
          const active = Array.isArray(match)
            ? match.some((m) => pathname.includes(m))
            : pathname.includes(match);
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 active:opacity-60 transition-opacity">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8}
                className={active ? "text-[#0071e3]" : "text-[#86868b]"} />
              <span className={`text-[11px] font-medium ${active ? "text-[#0071e3]" : "text-[#86868b]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
