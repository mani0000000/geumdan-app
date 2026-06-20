"use client";
import React, { useState, useEffect } from "react";
import { Bell, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSiteSetting } from "@/lib/db/site-settings";

const LOGO_CACHE_KEY = "site_logo_url";

interface HeaderProps {
  title?: string;
  showLocation?: boolean;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export default function Header({ title, showLocation, showBack, backHref, rightAction }: HeaderProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!showLocation) return;
    const cached = localStorage.getItem(LOGO_CACHE_KEY);
    if (cached) setLogoUrl(cached);
    fetchSiteSetting("logo_url").then(url => {
      if (url) {
        setLogoUrl(url);
        localStorage.setItem(LOGO_CACHE_KEY, url);
      }
    });
  }, [showLocation]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky z-40 bg-white/85 backdrop-blur-xl backdrop-saturate-180 border-b border-black/[0.06] transition-shadow duration-200"
      style={{
        top: 0,
        marginTop: "calc(env(safe-area-inset-top, 0px) * -1)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div className="flex items-center justify-between px-4 h-[52px]">
        <div className="flex items-center gap-1">
          {showBack && (
            <button onClick={() => backHref ? router.push(backHref) : router.back()}
              className="mr-1 active:scale-90 transition-transform duration-100">
              <ChevronLeft size={24} className="text-[#1d1d1f]" />
            </button>
          )}
          {showLocation ? (
            <div className="active:opacity-70 transition-opacity">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="검단신도시라이프" className="h-8 w-auto object-contain" />
              ) : (
                <span className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight">검단 신도시</span>
              )}
            </div>
          ) : (
            <h1 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-3">
          {rightAction}
          <Link href="/mypage/" className="relative active:opacity-50 transition-opacity">
            <Bell size={22} className="text-[#1d1d1f]" />
            <span className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] bg-[#f04452] rounded-full" />
          </Link>
        </div>
      </div>
    </header>
  );
}
