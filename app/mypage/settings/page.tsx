"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Bell, Shield, FileText, ExternalLink, LogOut, UserMinus } from "lucide-react";
import packageJson from "../../../package.json";

const APP_VERSION = packageJson.version;

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = () => {
    if (!confirm("로그아웃 하시겠어요?")) return;
    try {
      localStorage.removeItem("geumdan_uid");
      localStorage.removeItem("geumdan_profile");
    } catch { /* noop */ }
    router.push("/login/");
  };

  const handleWithdraw = () => {
    if (!confirm("정말 회원에서 탈퇴하시겠어요?\n계정 정보는 30일 후 영구 삭제돼요.")) return;
    alert("회원 탈퇴 신청이 접수됐어요. 고객센터에서 처리해 드릴게요.");
  };

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2 h-[52px] px-4">
          <button onClick={() => router.back()} aria-label="뒤로" className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">설정</h1>
        </div>
      </header>

      <div className="px-5 pt-5 pb-10 space-y-5">
        {/* 알림 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#86868b]">알림</p>
          <Link
            href="/mypage/notifications/"
            className="flex items-center gap-3 px-4 py-4 active:bg-[#f5f5f7] transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center">
              <Bell size={18} className="text-[#F59E0B]" />
            </span>
            <span className="flex-1 text-[14px] font-semibold text-[#1d1d1f]">알림 설정</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </Link>
        </div>

        {/* 약관 / 정책 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#86868b]">약관 및 정책</p>
          {[
            { label: "이용약관",       href: "https://geumdan.app/terms",   icon: <FileText size={18} className="text-[#6e6e73]" /> },
            { label: "개인정보 처리방침", href: "https://geumdan.app/privacy", icon: <Shield   size={18} className="text-[#6e6e73]" /> },
            { label: "위치기반 서비스 이용약관", href: "https://geumdan.app/location", icon: <FileText size={18} className="text-[#6e6e73]" /> },
          ].map((row, i, arr) => (
            <a
              key={row.label}
              href={row.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-4 active:bg-[#f5f5f7] transition-colors ${
                i !== arr.length - 1 ? "border-b border-[#f0f0f3]" : ""
              }`}
            >
              <span className="w-9 h-9 rounded-full bg-[#f5f5f7] flex items-center justify-center">
                {row.icon}
              </span>
              <span className="flex-1 text-[14px] font-semibold text-[#1d1d1f]">{row.label}</span>
              <ExternalLink size={16} className="text-[#c7c7cc]" />
            </a>
          ))}
        </div>

        {/* 앱 정보 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#86868b]">앱 정보</p>
          <div className="flex items-center px-4 py-4">
            <span className="flex-1 text-[14px] font-semibold text-[#1d1d1f]">앱 버전</span>
            <span className="text-[13px] text-[#86868b] font-mono">v{APP_VERSION}</span>
          </div>
        </div>

        {/* 계정 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#86868b]">계정</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-[#f5f5f7] transition-colors text-left border-b border-[#f0f0f3]"
          >
            <span className="w-9 h-9 rounded-full bg-[#FEE2E2] flex items-center justify-center">
              <LogOut size={18} className="text-[#EF4444]" />
            </span>
            <span className="flex-1 text-[14px] font-semibold text-[#EF4444]">로그아웃</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
          <button
            onClick={handleWithdraw}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-[#f5f5f7] transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-[#f5f5f7] flex items-center justify-center">
              <UserMinus size={18} className="text-[#86868b]" />
            </span>
            <span className="flex-1 text-[14px] font-semibold text-[#6e6e73]">회원 탈퇴</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
        </div>
      </div>
    </div>
  );
}
