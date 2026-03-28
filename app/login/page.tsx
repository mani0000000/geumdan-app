"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Phone } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    router.push("/home");
  };

  const handleSocial = async (provider: string) => {
    setLoading(true);
    console.log("Social login with", provider);
    await new Promise((r) => setTimeout(r, 600));
    router.push("/home");
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Hero */}
      <div className="gradient-primary flex flex-col items-center justify-center pt-16 pb-12 px-6">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🏡</span>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">검단 라이프</h1>
        <p className="text-blue-200 text-sm mt-1">검단 신도시 슈퍼앱</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-8 pb-10">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              placeholder="휴대폰 번호 (010-0000-0000)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-[52px] pl-11 pr-4 rounded-xl border border-gray-200 text-[15px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[52px] pl-11 pr-11 rounded-xl border border-gray-200 text-[15px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] gradient-primary rounded-xl text-white font-semibold text-[16px] flex items-center justify-center press-effect disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "로그인"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Social Login */}
        <div className="space-y-3">
          <button
            onClick={() => handleSocial("kakao")}
            className="w-full h-[52px] rounded-xl bg-[#FEE500] flex items-center justify-center gap-2.5 press-effect"
          >
            <span className="text-[20px]">💬</span>
            <span className="text-[#3A1D1D] font-semibold text-[15px]">카카오로 시작하기</span>
          </button>
          <button
            onClick={() => handleSocial("naver")}
            className="w-full h-[52px] rounded-xl bg-[#03C75A] flex items-center justify-center gap-2.5 press-effect"
          >
            <span className="text-white font-black text-[18px]">N</span>
            <span className="text-white font-semibold text-[15px]">네이버로 시작하기</span>
          </button>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link href="/signup" className="text-sm text-gray-500 press-effect">
            회원가입
          </Link>
          <div className="w-px h-3 bg-gray-300" />
          <button className="text-sm text-gray-500 press-effect">아이디 찾기</button>
          <div className="w-px h-3 bg-gray-300" />
          <button className="text-sm text-gray-500 press-effect">비밀번호 찾기</button>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-8 leading-relaxed">
          로그인 시 검단 라이프의{" "}
          <span className="text-blue-500">이용약관</span>과{" "}
          <span className="text-blue-500">개인정보처리방침</span>에
          동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
