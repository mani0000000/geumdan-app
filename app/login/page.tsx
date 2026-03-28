"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    router.push("/geumdan-app/home/");
  };

  const handleSocial = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    router.push("/geumdan-app/home/");
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Brand */}
      <div className="flex flex-col px-6 pt-16 pb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#3182F6] flex items-center justify-center mb-6">
          <span className="text-2xl">🏡</span>
        </div>
        <h1 className="text-[28px] font-bold text-[#191F28] leading-tight">
          검단 라이프에<br />오신 걸 환영해요
        </h1>
        <p className="text-[15px] text-[#8B95A1] mt-2">검단 신도시 주민을 위한 슈퍼앱</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 flex flex-col gap-3">
        <input
          type="tel"
          placeholder="휴대폰 번호"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[15px] text-[#191F28] placeholder:text-[#8B95A1] outline-none focus:ring-2 focus:ring-[#3182F6]"
        />
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-[52px] px-4 pr-12 rounded-xl bg-[#F2F4F6] text-[15px] text-[#191F28] placeholder:text-[#8B95A1] outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B95A1]"
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[16px] font-bold mt-1 flex items-center justify-center active:bg-[#1B64DA] transition-colors disabled:opacity-60"
        >
          {loading
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : "로그인"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#E5E8EB]" />
          <span className="text-[13px] text-[#8B95A1]">또는</span>
          <div className="flex-1 h-px bg-[#E5E8EB]" />
        </div>

        {/* Social */}
        <button
          onClick={handleSocial}
          className="w-full h-[52px] rounded-xl bg-[#FEE500] text-[#191F28] text-[15px] font-bold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <span className="text-xl">💬</span> 카카오로 시작하기
        </button>
        <button
          onClick={handleSocial}
          className="w-full h-[52px] rounded-xl bg-[#03C75A] text-white text-[15px] font-bold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <span className="font-black text-lg">N</span> 네이버로 시작하기
        </button>
      </div>

      {/* Bottom Links */}
      <div className="px-6 py-8 flex items-center justify-center gap-5">
        <Link href="/geumdan-app/signup/" className="text-[14px] text-[#8B95A1]">회원가입</Link>
        <div className="w-px h-3 bg-[#E5E8EB]" />
        <Link href="/geumdan-app/find-id/" className="text-[14px] text-[#8B95A1]">아이디 찾기</Link>
        <div className="w-px h-3 bg-[#E5E8EB]" />
        <Link href="/geumdan-app/find-password/" className="text-[14px] text-[#8B95A1]">비밀번호 찾기</Link>
      </div>
    </div>
  );
}
