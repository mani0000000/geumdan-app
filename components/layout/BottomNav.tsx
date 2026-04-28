"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Rss, Bus, Building2, User } from "lucide-react";

const navItems = [
  { href: "/stores",    label: "상가",    icon: Building2, match: "/stores" },
  { href: "/community", label: "소식",    icon: Rss,       match: ["/community", "/news", "/real-estate"] },
  { href: "/home",      label: "홈",      icon: Home,      match: "/home", center: true },
  { href: "/transport", label: "교통",    icon: Bus,       match: "/transport" },
  { href: "/mypage",    label: "MY",      icon: User,      match: "/mypage" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-[390px]">
      <div className="flex items-center justify-around px-3 h-[64px] rounded-[36px]
        bg-white/60 backdrop-blur-[28px]
        border border-white/50
        shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
        {navItems.map(({ href, label, icon: Icon, match, center }) => {
          const active = Array.isArray(match)
            ? match.some((m) => pathname.includes(m))
            : pathname.includes(match);

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] active:scale-90 transition-transform"
            >
              <div className={`flex items-center justify-center rounded-full transition-all
                ${center ? "w-10 h-10" : "w-8 h-8"}
                ${active
                  ? "bg-[#2563EB] shadow-[0_0_12px_rgba(37,99,235,0.6)]"
                  : "bg-transparent"
                }`}>
                <Icon
                  size={center ? 22 : 20}
                  strokeWidth={active ? 2.3 : 1.7}
                  className={active ? "text-white" : "text-[#8e8e93]"}
                />
              </div>
              <span className={`text-[10px] font-medium tracking-tight transition-colors
                ${active ? "text-[#2563EB]" : "text-[#8e8e93]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
