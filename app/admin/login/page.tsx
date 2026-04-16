"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const correct = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "geumdan2026";
    if (pw === correct) {
      sessionStorage.setItem("admin_auth", "1");
      router.replace("/admin/stores");
    } else {
      setErr(true);
      setPw("");
    }
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

        <form onSubmit={submit} className="bg-white/5 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-white/60 text-[12px] font-medium mb-1.5">
              관리자 비밀번호
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={e => { setPw(e.target.value); setErr(false); }}
                placeholder="비밀번호 입력"
                className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-11
                  text-[14px] outline-none focus:ring-2 focus:ring-[#3182F6] border border-white/10"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {err && (
              <p className="text-[#F04452] text-[12px] mt-1.5">비밀번호가 올바르지 않습니다.</p>
            )}
          </div>

          <button type="submit"
            className="w-full h-11 bg-[#3182F6] hover:bg-[#2563EB] text-white font-bold rounded-xl
              text-[14px] transition-colors active:scale-[.98]">
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
