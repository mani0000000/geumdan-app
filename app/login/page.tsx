"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
import { beginKakaoAuth, kakaoAuthErrorMessage } from "@/lib/auth/kakao";
import { formatKoreanMobile, phoneAuthErrorMessage, requestPhoneOtp, verifyPhoneOtp } from "@/lib/auth/phone";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const sendCode = async () => {
    setAuthError("");
    setLoading(true);
    try {
      await requestPhoneOtp(phone, false);
      setCodeSent(true);
      setRemaining(60);
      setCode("");
    } catch (error) {
      setAuthError(phoneAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!codeSent) return sendCode();
    setAuthError("");
    setLoading(true);
    try {
      const { user } = await verifyPhoneOtp(phone, code);
      const completed = user.app_metadata?.geumdan_onboarding_complete === true;
      router.replace(completed ? "/home/" : "/signup/?phone=verified");
    } catch (error) {
      setAuthError(phoneAuthErrorMessage(error));
      setLoading(false);
    }
  };

  const handleKakao = async () => {
    setAuthError("");
    setLoading(true);
    try {
      await beginKakaoAuth("login", "/home/");
    } catch (error) {
      setAuthError(kakaoAuthErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex flex-col px-6 pb-7 pt-16">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0071e3] text-white"><ShieldCheck size={25} /></div>
        <h1 className="text-[29px] font-bold leading-tight text-[#1d1d1f]">휴대폰 번호로<br />간편하게 로그인해요</h1>
        <p className="mt-2 text-[15px] text-[#6e6e73]">비밀번호 없이 문자 인증번호만 입력하면 돼요.</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-1 flex-col gap-3 px-6">
        <div className="flex gap-2">
          <input
            type="tel" inputMode="numeric" autoComplete="tel" aria-label="휴대폰 번호"
            placeholder="010-1234-5678" value={phone} disabled={codeSent}
            onChange={event => setPhone(formatKoreanMobile(event.target.value))}
            className="h-[52px] min-w-0 flex-1 rounded-xl bg-[#f5f5f7] px-4 text-[16px] text-[#1d1d1f] outline-none transition focus:ring-2 focus:ring-[#0071e3] disabled:text-[#86868b]"
          />
          {codeSent && <button type="button" onClick={() => { setCodeSent(false); setCode(""); setRemaining(0); }} className="shrink-0 px-2 text-[14px] font-bold text-[#0071e3]">번호 변경</button>}
        </div>

        {codeSent && (
          <div className="relative">
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code" aria-label="인증번호"
              placeholder="인증번호 6자리" value={code} maxLength={6} autoFocus
              onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-[52px] w-full rounded-xl bg-[#f5f5f7] px-4 pr-20 text-[18px] tracking-[0.2em] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#0071e3]">{remaining > 0 ? `00:${String(remaining).padStart(2, "0")}` : "재전송 가능"}</span>
          </div>
        )}

        {codeSent && (
          <div className="flex items-center justify-between px-1 text-[13px]">
            <span className="flex items-center gap-1.5 text-[#248A3D]"><CheckCircle2 size={15} /> 인증번호를 보냈어요</span>
            <button type="button" onClick={sendCode} disabled={loading || remaining > 0} className="font-bold text-[#0071e3] disabled:text-[#a1a1a6]">다시 받기</button>
          </div>
        )}

        {authError && <div role="alert" className="flex items-start gap-2 rounded-xl bg-[#FFF1F1] px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-[#B42318]"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{authError}</span></div>}

        <button type="submit" disabled={loading || (codeSent ? code.length !== 6 : phone.replace(/\D/g, "").length !== 11)} className="mt-1 flex h-[52px] w-full items-center justify-center rounded-xl bg-[#0071e3] text-[17px] font-bold text-white transition active:bg-[#0058b0] disabled:opacity-40">
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : codeSent ? "인증하고 로그인" : "인증번호 받기"}
        </button>

        <div className="my-1 flex items-center gap-3"><div className="h-px flex-1 bg-[#d2d2d7]" /><span className="text-[14px] text-[#6e6e73]">또는</span><div className="h-px flex-1 bg-[#d2d2d7]" /></div>
        <button type="button" onClick={handleKakao} disabled={loading} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-[16px] font-bold text-[#1d1d1f] transition active:opacity-80 disabled:opacity-60"><MessageCircle size={20} fill="currentColor" strokeWidth={1.8} />카카오로 로그인</button>
      </form>

      <div className="flex items-center justify-center gap-2 px-6 py-8 text-[15px] text-[#6e6e73]">아직 계정이 없나요?<Link href="/signup/" className="font-bold text-[#0071e3]">휴대폰으로 가입</Link></div>
    </div>
  );
}
