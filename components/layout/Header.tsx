"use client";
import React, { useState, useEffect } from "react";
import { Bell, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSiteSetting } from "@/lib/db/site-settings";
import { fetchUnreadCount } from "@/lib/db/notifications";
import { getOrCreateUserId } from "@/lib/db/userdata";

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
  const [unread, setUnread] = useState<number>(0);

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
    let cancelled = false;
    (async () => {
      try {
        const uid = await getOrCreateUserId();
        if (cancelled) return;
        const count = await fetchUnreadCount(uid);
        if (!cancelled) setUnread(count);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl backdrop-saturate-180 border-b border-black/[0.08]">
      <div className="flex items-center justify-between px-4 h-[52px]">
        <div className="flex items-center gap-1">
          {showBack && (
            <button onClick={() => backHref ? router.push(backHref) : router.back()}
              className="mr-1 active:opacity-50 transition-opacity">
              <ChevronLeft size={24} className="text-[#1d1d1f]" />
            </button>
          )}
          {showLocation ? (
            <div className="active:opacity-50 transition-opacity">
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
          <Link href="/notifications/" className="relative active:opacity-50 transition-opacity">
            <Bell size={22} className="text-[#1d1d1f]" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#f04452] text-white rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
