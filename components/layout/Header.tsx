"use client";
import React from "react";
import { Bell, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface HeaderProps {
  title?: string;
  showLocation?: boolean;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export default function Header({ title, showLocation, showBack, backHref, rightAction }: HeaderProps) {
  const router = useRouter();
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
              <Image
                src="/logos/logo.png"
                alt="검단신도시라이프"
                width={160}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
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
