"use client";
import { useEffect, useRef, useState } from "react";
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
  const pathname  = usePathname();
  const [hidden,  setHidden]  = useState(false);
  const lastY     = useRef(0);
  const pending   = useRef(false);

  // 경로 변경 시 항상 다시 표시
  useEffect(() => {
    setHidden(false);
    lastY.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      if (pending.current) return;
      pending.current = true;
      requestAnimationFrame(() => {
        const cur  = window.scrollY;
        const diff = cur - lastY.current;
        if (diff > 6 && cur > 80) {
          setHidden(true);          // 아래로 스크롤 → 숨김
        } else if (diff < -6) {
          setHidden(false);         // 위로 스크롤 → 표시
        }
        lastY.current  = cur;
        pending.current = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position:   "fixed",
        bottom:     20,
        left:       "50%",
        transform:  hidden
          ? "translateX(-50%) translateY(calc(100% + 20px))"
          : "translateX(-50%) translateY(0)",
        transition: "transform 0.32s cubic-bezier(0.34, 1.15, 0.64, 1)",
        zIndex:     9000,
        width:      "calc(100% - 40px)",
        maxWidth:   390,
      }}
    >
      <div style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-around",
        padding:         "0 12px",
        height:          64,
        borderRadius:    36,
        background:      "rgba(255,255,255,0.65)",
        backdropFilter:  "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border:          "1px solid rgba(255,255,255,0.50)",
        boxShadow:       "0 4px 24px rgba(0,0,0,0.10)",
      }}>
        {navItems.map(({ href, label, icon: Icon, match, center }) => {
          const active = Array.isArray(match)
            ? match.some((m) => pathname.includes(m))
            : pathname.includes(match);

          return (
            <Link
              key={href}
              href={href}
              className="active:scale-90 transition-transform"
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            3,
              }}
            >
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                borderRadius:   "50%",
                width:          center ? 40 : 32,
                height:         center ? 40 : 32,
                background:     active ? "#2563EB" : "transparent",
                boxShadow:      active ? "0 0 12px rgba(37,99,235,0.6)" : "none",
                transition:     "all 0.2s",
              }}>
                <Icon
                  size={center ? 22 : 20}
                  strokeWidth={active ? 2.3 : 1.7}
                  style={{ color: active ? "white" : "#8e8e93" }}
                />
              </div>
              <span style={{
                fontSize:      10,
                fontWeight:    500,
                letterSpacing: "-0.02em",
                color:         active ? "#2563EB" : "#8e8e93",
                transition:    "color 0.2s",
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
