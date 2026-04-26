"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Tag, Store, ChevronRight, LogOut, LayoutDashboard, Menu, X, MessageSquare, TrendingUp, LayoutGrid, MapPin, Search, Image, Pill, Siren, Newspaper, Settings, ShoppingBag, Trophy,
} from "lucide-react";

const NAV = [
  { href: "/admin/banners",    icon: Image,         label: "배너 관리"     },
  { href: "/admin/stores",     icon: Building2,     label: "상가건물 관리" },
  { href: "/admin/coupons",    icon: Tag,           label: "쿠폰 관리"    },
  { href: "/admin/openings",   icon: Store,         label: "신규오픈 관리" },
  { href: "/admin/pharmacy",   icon: Pill,          label: "약국 관리"     },
  { href: "/admin/emergency",  icon: Siren,         label: "응급실 관리"   },
  { href: "/admin/community",  icon: MessageSquare, label: "커뮤니티 관리" },
  { href: "/admin/news",       icon: Newspaper,     label: "소식 관리"     },
  { href: "/admin/realestate", icon: TrendingUp,    label: "부동산 시세"   },
  { href: "/admin/widgets",    icon: LayoutGrid,    label: "홈 위젯 구성"  },
  { href: "/admin/marts",      icon: ShoppingBag,   label: "주변 마트 관리" },
  { href: "/admin/places",     icon: MapPin,        label: "가볼만한곳 관리"},
  { href: "/admin/keywords",   icon: Search,        label: "검색어 관리"   },
  { href: "/admin/sports",      icon: Trophy,        label: "스포츠 관리"   },
  { href: "/admin/settings",   icon: Settings,      label: "앱 설정"       },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";

  useEffect(() => {
    const ok = sessionStorage.getItem("admin_auth") === "1";
    if (!ok && !isLoginPage) {
      router.replace("/admin/login");
    } else {
      setAuthed(ok);
    }
  }, [pathname, router, isLoginPage]);

  function logout() {
    sessionStorage.removeItem("admin_auth");
    router.replace("/admin/login");
  }

  if (isLoginPage) return <>{children}</>;
  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">

      {/* ── 데스크탑 사이드바 ──────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[220px] bg-[#191F28] z-30">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-[#3182F6]" />
            <span className="text-white font-extrabold text-[15px]">검단 백오피스</span>
          </div>
          <p className="text-white/40 text-[11px] mt-1">관리자 전용</p>
        </div>
        <nav className="flex-1 min-h-0 py-4 space-y-0.5 px-2 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all
                  ${active ? "bg-[#3182F6] text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                <Icon size={16} />{label}
                {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <LogOut size={14} />로그아웃
          </button>
        </div>
      </aside>

      {/* ── 모바일 상단 헤더 ──────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#191F28] flex items-center justify-between px-4 h-[52px] border-b border-white/10">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={16} className="text-[#3182F6]" />
          <span className="text-white font-extrabold text-[14px]">검단 백오피스</span>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="text-white/60 hover:text-white p-1">
          <Menu size={22} />
        </button>
      </header>

      {/* ── 모바일 드로어 ──────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative z-50 w-[260px] h-full bg-[#191F28] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={16} className="text-[#3182F6]" />
                <span className="text-white font-extrabold text-[14px]">검단 백오피스</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-white/50 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 min-h-0 py-4 space-y-1 px-3 overflow-y-auto">
              {NAV.map(({ href, icon: Icon, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-all
                      ${active ? "bg-[#3182F6] text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                    <Icon size={17} />{label}
                    {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 py-4 border-t border-white/10">
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-[14px] text-white/50 hover:text-white hover:bg-white/10">
                <LogOut size={15} />로그아웃
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── 메인 콘텐츠 ──────────────────────────────── */}
      <main className="md:ml-[220px] pt-[52px] md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
