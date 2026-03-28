"use client";
import { Bell, ChevronDown, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  showLocation?: boolean;
  showBack?: boolean;
  backHref?: string;
}

export default function Header({ title, showLocation, showBack, backHref }: HeaderProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#F2F4F6]">
      <div className="flex items-center justify-between px-4 h-[56px]">
        <div className="flex items-center gap-1">
          {showBack && (
            <button onClick={() => backHref ? router.push(backHref) : router.back()}
              className="mr-1 active:opacity-60">
              <ChevronLeft size={24} className="text-[#191F28]" />
            </button>
          )}
          {showLocation ? (
            <button className="flex items-center gap-0.5 active:opacity-60">
              <span className="text-[18px] font-bold text-[#191F28]">검단 신도시</span>
              <ChevronDown size={16} className="text-[#8B95A1] mt-0.5" />
            </button>
          ) : (
            <h1 className="text-[18px] font-bold text-[#191F28]">{title}</h1>
          )}
        </div>
        <Link href="/mypage/" className="relative active:opacity-60">
          <Bell size={22} className="text-[#191F28]" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#F04452] rounded-full" />
        </Link>
      </div>
    </header>
  );
}
