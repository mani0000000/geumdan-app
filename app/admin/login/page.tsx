"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        sessionStorage.setItem("admin_auth", "1");
        router.replace("/admin/stores");
      } else {
        setError(data.error ?? "로그인 실패");
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            autoComplete="current-password"
            className="w-full h-12 bg-white/10 text-white placeholder-white/30 rounded-xl px-4
              text-[15px] outline-none focus:ring-2 focus:ring-[#3182F6] border border-white/10"
          />
          {error && (
            <p className="text-red-400 text-[13px] text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full h-12 bg-[#3182F6] hover:bg-[#2563EB] disabled:opacity-50
              text-white font-bold rounded-xl text-[15px] transition-colors active:scale-[.98]">
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
