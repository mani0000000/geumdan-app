"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Tag, Store, ChevronRight, LogOut, LayoutDashboard,
} from "lucide-react";

const NAV = [
  { href: "/admin/stores",   icon: Building2,      label: "상가건물 관리" },
  { href: "/admin/coupons",  icon: Tag,            label: "쿠폰 관리"    },
  { href: "/admin/openings", icon: Store,          label: "신규오픈 관리" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);

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
    <div className="min-h-screen bg-[#F5F6F8] flex">
      {/* ── 사이드바 ── */}
      <aside className="w-[220px] shrink-0 bg-[#191F28] flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-[#3182F6]" />
            <span className="text-white font-extrabold text-[15px]">검단 백오피스</span>
          </div>
          <p className="text-white/40 text-[11px] mt-1">관리자 전용</p>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all
                  ${active
                    ? "bg-[#3182F6] text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}>
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
