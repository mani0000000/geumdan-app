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

  return (
    <>
      {/* 상태바 유리 캡 — position:fixed 로 viewport 기준 배치.
          overflow-x:hidden 클리핑 영향 없음. 헤더와 동일한 glass 스타일로
          Dynamic Island / 노치 뒤를 자연스럽게 채움. */}
      <div
        className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl backdrop-saturate-180"
        style={{ height: "env(safe-area-inset-top, 0px)" }}
      />
      <header
        className="sticky z-40 bg-white/80 backdrop-blur-xl backdrop-saturate-180 border-b border-black/[0.08]"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
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
          <Link href="/mypage/" className="relative active:opacity-50 transition-opacity">
            <Bell size={22} className="text-[#1d1d1f]" />
            <span className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] bg-[#f04452] rounded-full" />
          </Link>
        </div>
      </div>
    </header>
    </>
  );
}
