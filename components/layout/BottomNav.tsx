"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Rss, Navigation, Store, User } from "lucide-react";
import SuggestFAB from "@/components/ui/SuggestFAB";

type IconProps = { size?: number; className?: string };

function StoreSolid({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.5 3A1.5 1.5 0 0 0 3 4.5v.4L1.85 8.7a3 3 0 0 0 5.4 2.55 3 3 0 0 0 4.75 0 3 3 0 0 0 4.75 0 3 3 0 0 0 5.4-2.55L21 4.9v-.4A1.5 1.5 0 0 0 19.5 3h-15Z" />
      <path d="M3 12.55V19.5A1.5 1.5 0 0 0 4.5 21H10v-4.25a2 2 0 1 1 4 0V21h5.5a1.5 1.5 0 0 0 1.5-1.5v-6.95a4.5 4.5 0 0 1-2.5.45 4.5 4.5 0 0 1-2.5-.85 4.5 4.5 0 0 1-2.375.85 4.5 4.5 0 0 1-2.375-.85 4.5 4.5 0 0 1-2.375.85 4.5 4.5 0 0 1-2.375-.85 4.5 4.5 0 0 1-2.5.85 4.5 4.5 0 0 1-2.5-.45Z" />
    </svg>
  );
}

function NewspaperSolid({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5Zm1 3.5A.5.5 0 0 1 6.5 6h6a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-4Zm9 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5Zm0 2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5Zm-9 4.25c0-.41.34-.75.75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H6.75Z"
      />
    </svg>
  );
}

const navItems = [
  { href: "/stores",    label: "상가",      icon: Store,      iconActive: StoreSolid,     match: "/stores" },
  { href: "/community", label: "소식",      icon: Rss,        iconActive: NewspaperSolid, match: ["/community", "/news", "/real-estate"] },
  { href: "/home",      label: "홈",        icon: Home,       match: "/home", center: true },
  { href: "/transport", label: "여행/교통", icon: Navigation, match: "/transport" },
  { href: "/mypage",    label: "MY",        icon: User,       match: "/mypage" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isStoresPath = pathname.startsWith("/stores");
  return (
    <>
      {isStoresPath && <SuggestFAB />}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-[390px]">
        <div className="flex items-center justify-around px-3 h-[64px] rounded-[36px]
          bg-white/60 backdrop-blur-[28px]
          border border-white/50
          shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
          {navItems.map((item) => {
            const { href, label, icon: Icon, iconActive: IconActive, match, center } = item;
            const active = Array.isArray(match)
              ? match.some((m) => pathname.includes(m))
              : pathname.includes(match);

            const useSolid = active && !center && IconActive;
            const iconSize = center ? 22 : 20;
            const iconColor = active
              ? center
                ? "text-white"
                : "text-black"
              : "text-[#8e8e93]";

            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-[3px] active:scale-90 transition-transform"
              >
                <div className={`flex items-center justify-center rounded-full transition-all
                  ${center ? "w-10 h-10" : "w-8 h-8"}
                  ${active && center
                    ? "bg-[#2563EB] shadow-[0_0_12px_rgba(37,99,235,0.6)]"
                    : "bg-transparent"
                  }`}>
                  {useSolid ? (
                    <IconActive size={iconSize} className={iconColor} />
                  ) : (
                    <Icon
                      size={iconSize}
                      strokeWidth={active ? 2.3 : 1.7}
                      fill={active && !center ? "currentColor" : "none"}
                      className={iconColor}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-medium tracking-tight transition-colors
                  ${active ? "text-black" : "text-[#8e8e93]"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
