"use client";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  function enter() {
    sessionStorage.setItem("admin_auth", "1");
    router.replace("/admin/stores");
  }

  return (
    <div className="min-h-screen bg-[#191F28] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#3182F6] rounded-2xl mb-4">
            <Lock size={24} className="text-white" />
          </div>
          <h1 className="text-white text-[24px] font-extrabold">검단 백오피스</h1>
          <p className="text-white/40 text-[13px] mt-1">관리자만 접근 가능합니다</p>
        </div>
        <button onClick={enter}
          className="w-full h-12 bg-[#3182F6] hover:bg-[#2563EB] text-white font-bold rounded-xl
            text-[15px] transition-colors active:scale-[.98]">
          로그인
        </button>
      </div>
    </div>
  );
}
