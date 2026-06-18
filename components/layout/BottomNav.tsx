"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Navigation, User, MessageCircle } from "lucide-react";
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

function MessageCircleSolid({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.029 2 11c0 2.526 1.165 4.808 3.038 6.439L4 22l4.997-2.058A11.05 11.05 0 0 0 12 20c5.523 0 10-4.029 10-9s-4.477-9-10-9Z" />
    </svg>
  );
}

const navItems = [
  { href: "/stores",    label: "상가",      iconActive: StoreSolid,         iconInactive: StoreSolid,         match: "/stores" },
  { href: "/community", label: "소식",      iconActive: MessageCircleSolid, iconInactive: MessageCircle,      match: ["/community", "/news", "/real-estate"] },
  { href: "/home",      label: "홈",        iconActive: Home,               iconInactive: Home,               match: "/home", center: true },
  { href: "/transport", label: "여행/교통", iconActive: Navigation,         iconInactive: Navigation,         match: "/transport" },
  { href: "/mypage",    label: "MY",        iconActive: User,               iconInactive: User,               match: "/mypage" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isStoresPath = pathname.startsWith("/stores");
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    setHidden(false);
    lastY.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      if (pending.current) return;
      pending.current = true;
      requestAnimationFrame(() => {
        const cur = window.scrollY;
        const diff = cur - lastY.current;
        if (diff > 6 && cur > 80) setHidden(true);
        else if (diff < -6) setHidden(false);
        lastY.current = cur;
        pending.current = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {isStoresPath && <SuggestFAB />}
      <nav
        className="fixed z-[9000]"
        style={{
          bottom: 20,
          left: "50%",
          transform: hidden
            ? "translateX(-50%) translateY(calc(100% + 20px))"
            : "translateX(-50%) translateY(0)",
          transition: "transform 0.32s cubic-bezier(0.34, 1.15, 0.64, 1)",
          width: "calc(100% - 40px)",
          maxWidth: 390,
        }}
      >
        <div className="flex items-center justify-around px-3 h-[64px] rounded-[36px]
          bg-white/60 backdrop-blur-[28px]
          border border-white/50
          shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
          {navItems.map(({ href, label, iconActive: IconActive, iconInactive: IconInactive, match, center }) => {
            const active = Array.isArray(match)
              ? match.some((m) => pathname.includes(m))
              : pathname.includes(match);

            const iconSize = center ? 22 : 20;
            const iconColor = active
              ? center ? "text-white" : "text-[#3182F6]"
              : "text-[#8e8e93]";

            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-[2px] active:scale-90 transition-transform"
              >
                <div className={`flex items-center justify-center rounded-full transition-all
                  ${center ? "w-10 h-10" : "w-8 h-8"}
                  ${active && center
                    ? "bg-[#3182F6] shadow-[0_0_14px_rgba(49,130,246,0.55)]"
                    : "bg-transparent"
                  }`}>
                  {active ? (
                    <IconActive
                      size={iconSize}
                      className={iconColor}
                    />
                  ) : (
                    <IconInactive
                      size={iconSize}
                      strokeWidth={1.7}
                      className={iconColor}
                    />
                  )}
                </div>
                <span className={`text-[10px] leading-none font-medium tracking-tight transition-colors
                  ${active ? "text-[#3182F6]" : "text-[#8e8e93]"}`}>
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
