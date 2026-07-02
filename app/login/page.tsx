"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { fetchSiteSetting } from "@/lib/db/site-settings";
import { supabase } from "@/lib/supabase";
import { isValidKoreanMobile, normalizeKoreanPhone } from "@/lib/auth";

const LOGO_CACHE_KEY = "site_logo_url";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem(LOGO_CACHE_KEY);
    if (cached) setLogoUrl(cached);
    fetchSiteSetting("logo_url").then(url => {
      if (url) {
        setLogoUrl(url);
        localStorage.setItem(LOGO_CACHE_KEY, url);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidKoreanMobile(phone) || !password) {
      setError("휴대폰 번호와 비밀번호를 확인해 주세요.");
      return;
    }
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      phone: normalizeKoreanPhone(phone),
      password,
    });
    if (authError || !data.user) {
      setError(authError?.message ?? "로그인에 실패했습니다.");
      setLoading(false);
      return;
    }
    localStorage.setItem("geumdan_uid", data.user.id);
    router.replace("/home/");
  };

  const handleSocial = async () => {
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/home/` },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Brand */}
      <div className="flex flex-col px-6 pt-16 pb-8">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="검단신도시라이프" className="h-12 w-auto object-contain self-start mb-6" />
        ) : (
          <span className="text-[24px] font-bold text-[#1d1d1f] tracking-tight mb-6">검단 신도시</span>
        )}
        <h1 className="text-[22px] font-semibold text-[#86868b] leading-tight">
          우리가 만드는<br />우리동네 핫한 최신 이야기
        </h1>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 flex flex-col gap-3">
        <input
          type="tel"
          placeholder="휴대폰 번호"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none focus:ring-2 focus:ring-[#3182F6]"
        />
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-[52px] px-4 pr-12 rounded-xl bg-[#f5f5f7] text-[16px] text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e6e73]"
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[17px] font-bold mt-1 flex items-center justify-center active:bg-[#2563EB] transition-colors disabled:opacity-60"
        >
          {loading
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : "로그인"}
        </button>

        {error && <p className="text-[13px] text-[#F04452] text-center">{error}</p>}

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#d2d2d7]" />
          <span className="text-[14px] text-[#6e6e73]">또는</span>
          <div className="flex-1 h-px bg-[#d2d2d7]" />
        </div>

        {/* Social */}
        <button
          onClick={handleSocial}
          className="w-full h-[52px] rounded-xl bg-[#FEE500] text-[#1d1d1f] text-[16px] font-bold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <span className="text-xl">💬</span> 카카오로 시작하기
        </button>
      </div>

      {/* Bottom Links */}
      <div className="px-6 py-8 flex items-center justify-center gap-5">
        <Link href="/signup/" className="text-[15px] text-[#6e6e73]">회원가입</Link>
        <div className="w-px h-3 bg-[#d2d2d7]" />
        <Link href="/find-id/" className="text-[15px] text-[#6e6e73]">아이디 찾기</Link>
        <div className="w-px h-3 bg-[#d2d2d7]" />
        <Link href="/find-password/" className="text-[15px] text-[#6e6e73]">비밀번호 찾기</Link>
      </div>
    </div>
  );
}
