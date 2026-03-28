"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  showLocation?: boolean;
  showSearch?: boolean;
  showNotification?: boolean;
  onBack?: () => void;
}

export default function Header({
  title,
  showLocation = false,
  showSearch = false,
  showNotification = true,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 h-[56px]">
        {showLocation ? (
          <button className="flex items-center gap-1 press-effect">
            <span className="text-[17px] font-bold text-gray-900">검단 신도시</span>
            <ChevronDown size={18} className="text-gray-500 mt-0.5" />
          </button>
        ) : (
          <h1 className="text-[17px] font-bold text-gray-900">{title}</h1>
        )}

        <div className="flex items-center gap-2">
          {showSearch && (
            <button className="w-9 h-9 flex items-center justify-center press-effect">
              <Search size={20} className="text-gray-600" />
            </button>
          )}
          {showNotification && (
            <Link
              href="/mypage"
              className="w-9 h-9 flex items-center justify-center press-effect relative"
            >
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
