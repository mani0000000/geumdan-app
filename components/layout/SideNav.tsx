"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Navigation, Store, User, MessageCircle, Bell } from "lucide-react";

function StoreSolid({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.5 3A1.5 1.5 0 0 0 3 4.5v.4L1.85 8.7a3 3 0 0 0 5.4 2.55 3 3 0 0 0 4.75 0 3 3 0 0 0 4.75 0 3 3 0 0 0 5.4-2.55L21 4.9v-.4A1.5 1.5 0 0 0 19.5 3h-15Z" />
      <path d="M3 12.55V19.5A1.5 1.5 0 0 0 4.5 21H10v-4.25a2 2 0 1 1 4 0V21h5.5a1.5 1.5 0 0 0 1.5-1.5v-6.95a4.5 4.5 0 0 1-2.5.45 4.5 4.5 0 0 1-2.5-.85 4.5 4.5 0 0 1-2.375.85 4.5 4.5 0 0 1-2.375-.85 4.5 4.5 0 0 1-2.375.85 4.5 4.5 0 0 1-2.375-.85 4.5 4.5 0 0 1-2.5.85 4.5 4.5 0 0 1-2.5-.45Z" />
    </svg>
  );
}

function MessageCircleSolid({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.477 2 2 6.029 2 11c0 2.526 1.165 4.808 3.038 6.439L4 22l4.997-2.058A11.05 11.05 0 0 0 12 20c5.523 0 10-4.029 10-9s-4.477-9-10-9Z" />
    </svg>
  );
}

const navItems = [
  { href: "/home",      label: "홈",        icon: Home,         iconActive: null,                match: "/home" },
  { href: "/stores",    label: "상가",      icon: Store,        iconActive: StoreSolid,          match: "/stores" },
  { href: "/community", label: "소식",      icon: MessageCircle,iconActive: MessageCircleSolid,  match: ["/community", "/real-estate"] },
  { href: "/transport", label: "여행/교통", icon: Navigation,   iconActive: null,                match: "/transport" },
  { href: "/mypage",    label: "MY",        icon: User,         iconActive: null,                match: "/mypage" },
];

export default function SideNav() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  if (isAdmin) return null;

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-dvh w-[220px] bg-white border-r border-gray-100 z-40">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/home" className="block active:opacity-70">
          <span className="text-[20px] font-black text-[#1d1d1f] tracking-tight">검단 라이프</span>
          <p className="text-[11px] text-[#86868b] mt-0.5">검단 신도시 슈퍼앱</p>
        </Link>
      </div>

      {/* 메인 네비 */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, iconActive: IconActive, match }) => {
          const active = Array.isArray(match)
            ? match.some(m => pathname?.startsWith(m))
            : !!pathname?.startsWith(match);

          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
                active
                  ? "bg-[#e8f1fd] text-[#0071e3]"
                  : "text-[#424245] hover:bg-gray-50 hover:text-[#1d1d1f]"
              }`}>
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {active && IconActive
                  ? <IconActive size={20} className="text-[#0071e3]" />
                  : <Icon size={20} strokeWidth={active ? 2.3 : 1.8} className={active ? "text-[#0071e3]" : ""} />
                }
              </div>
              <span className={`text-[15px] ${active ? "font-semibold text-[#0071e3]" : "font-medium"}`}>
                {label}
              </span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 하단 알림 */}
      <div className="px-3 pb-5 border-t border-gray-100 pt-3">
        <Link href="/notifications/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#424245] hover:bg-gray-50 transition-colors">
          <Bell size={20} strokeWidth={1.8} />
          <span className="text-[15px] font-medium">알림</span>
        </Link>
      </div>
    </aside>
  );
}
