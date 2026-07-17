"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, Check, FileText, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { getUserProfile } from "@/lib/db/userdata";
import { beginKakaoAuth, kakaoAuthErrorMessage } from "@/lib/auth/kakao";
import { formatKoreanMobile, phoneAuthErrorMessage, requestPhoneOtp, verifyPhoneOtp } from "@/lib/auth/phone";
import { supabase } from "@/lib/supabase";
import { fetchAllTerms, type Term } from "@/lib/db/terms";

const steps = ["약관 동의", "본인 인증", "프로필 설정"];
import { DONG_SELECT_OPTIONS } from "@/lib/geumdan";
const dongs = DONG_SELECT_OPTIONS;

type AgreementKey = "terms" | "privacy" | "location" | "marketing";

const AGREEMENT_TERM_TYPE: Record<AgreementKey, Term["type"]> = {
  terms: "service",
  privacy: "privacy",
  location: "location",
  marketing: "marketing",
};

function CheckRow({
  checked,
  label,
  onToggle,
  onView,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  onView: () => void;
}) {
  return (
    <div className="flex min-h-12 items-center gap-2 border-b border-[#F2F4F7] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left active:opacity-70"
      >
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-[#0071e3] bg-[#0071e3]" : "border-[#c7c7cc]"}`}>
          {checked && <Check size={11} className="text-white" strokeWidth={3} />}
        </span>
        <span className="truncate text-[15px] font-medium text-[#1d1d1f]">{label}</span>
      </button>
      <button
        type="button"
        onClick={onView}
        aria-label={`${label} 내용 보기`}
        className="flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-2 text-[13px] font-semibold text-[#6e6e73] active:bg-[#f5f5f7]"
      >
        내용 보기 <ChevronRight size={14} />
      </button>
    </div>
  );
}

function renderTermContent(content: string) {
  return content.split("\n").map((line, index) => {
    if (line.startsWith("## ")) {
      return <h3 key={index} className="mb-2 mt-6 text-[16px] font-extrabold text-[#1d1d1f] first:mt-0">{line.slice(3)}</h3>;
    }
    if (line.startsWith("• ")) {
      return <p key={index} className="pl-3 text-[14px] leading-7 text-[#3d3d3f]">{line}</p>;
    }
    if (!line.trim()) return <div key={index} className="h-2" />;
    return <p key={index} className="text-[14px] leading-7 text-[#3d3d3f]">{line}</p>;
  });
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [agree, setAgree] = useState({ all: false, terms: false, privacy: false, location: false, marketing: false });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [nickname, setNickname] = useState("");
  const [dong, setDong] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKakaoSignup, setIsKakaoSignup] = useState(false);
  const [authError, setAuthError] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [viewingTerm, setViewingTerm] = useState<Term["type"] | null>(null);

  useEffect(() => {
    const connected = new URLSearchParams(window.location.search).get("social") === "kakao";
    setIsKakaoSignup(connected);
    if (connected) {
      getUserProfile().then(profile => {
        if (profile.nickname !== "검단주민") setNickname(profile.nickname);
        if (profile.dong) setDong(profile.dong);
      });
    }
    fetchAllTerms().then(setTerms);
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  useEffect(() => {
    if (!viewingTerm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [viewingTerm]);

  const toggleAll = () => {
    const v = !agree.all;
    setAgree({ all: v, terms: v, privacy: v, location: v, marketing: v });
  };
  const toggle = (k: keyof typeof agree) => {
    const u = { ...agree, [k]: !agree[k] };
    u.all = u.terms && u.privacy && u.location && u.marketing;
    setAgree(u);
  };

  const agreeFromDetail = (key: AgreementKey) => {
    setAgree(previous => {
      const updated = { ...previous, [key]: true };
      updated.all = updated.terms && updated.privacy && updated.location && updated.marketing;
      return updated;
    });
    setViewingTerm(null);
  };

  const activeTerm = viewingTerm ? terms.find(term => term.type === viewingTerm) ?? null : null;
  const activeAgreement = viewingTerm
    ? (Object.entries(AGREEMENT_TERM_TYPE).find(([, type]) => type === viewingTerm)?.[0] as AgreementKey | undefined)
    : undefined;

  const sendPhoneCode = async () => {
    setAuthError("");
    setLoading(true);
    try {
      await requestPhoneOtp(phone, true);
      setCodeSent(true);
      setCode("");
      setRemaining(60);
    } catch (error) {
      setAuthError(phoneAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("로그인 세션이 만료됐어요. 다시 인증해 주세요.");
    const response = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        nickname: nickname.trim(),
        dong,
        agreements: { terms: agree.terms, privacy: agree.privacy, location: agree.location, marketing: agree.marketing },
      }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error || "가입 정보를 저장하지 못했어요.");
    await getUserProfile();
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;
  };

  const next = async () => {
    if (step === 2) {
      setLoading(true);
      setAuthError("");
      try {
        await completeOnboarding();
        router.replace("/home/");
      } catch (error) {
        setAuthError(isKakaoSignup ? kakaoAuthErrorMessage(error) : phoneAuthErrorMessage(error));
        setLoading(false);
      }
    } else if (step === 1) {
      setLoading(true);
      setAuthError("");
      try {
        const { user } = await verifyPhoneOtp(phone, code);
        if (user.app_metadata?.geumdan_onboarding_complete === true) {
          router.replace("/home/");
          return;
        }
        setPhoneVerified(true);
        setStep(2);
      } catch (error) {
        setAuthError(phoneAuthErrorMessage(error));
      } finally {
        setLoading(false);
      }
    } else if (step === 0 && isKakaoSignup) {
      setStep(2);
    } else setStep(s => s + 1);
  };

  const startKakaoSignup = async () => {
    setAuthError("");
    setLoading(true);
    try {
      await beginKakaoAuth("signup", "/signup/?social=kakao");
    } catch (error) {
      setAuthError(kakaoAuthErrorMessage(error));
      setLoading(false);
    }
  };

  const activeSteps = isKakaoSignup ? ["약관 동의", "프로필 설정"] : steps;
  const activeStepIndex = isKakaoSignup && step === 2 ? 1 : step;

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14">
        {step > 0
          ? <button onClick={() => setStep(s => isKakaoSignup && s === 2 ? 0 : s - 1)} className="active:opacity-60"><ChevronLeft size={24} className="text-[#1d1d1f]" /></button>
          : <Link href="/login/" className="active:opacity-60"><ChevronLeft size={24} className="text-[#1d1d1f]" /></Link>
        }
      </div>

      {/* Progress */}
      <div className="px-6 pb-0">
        <div className="flex gap-1 mb-4">
          {activeSteps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= activeStepIndex ? "bg-[#0071e3]" : "bg-[#d2d2d7]"}`} />
          ))}
        </div>
        <p className="text-[13px] text-[#6e6e73] mb-1">{activeStepIndex + 1} / {activeSteps.length}</p>
        <h2 className="text-[23px] font-bold text-[#1d1d1f] leading-snug mb-6">
          {step === 0 && "약관에 동의해 주세요"}
          {step === 1 && "본인 인증을 해 주세요"}
          {step === 2 && (isKakaoSignup ? "카카오 프로필을 확인해 주세요" : "검단 어디에 사세요?")}
        </h2>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        {step === 0 && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={startKakaoSignup}
              disabled={loading || isKakaoSignup}
              className="mb-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-[15px] font-black text-[#191919] transition-opacity active:opacity-80 disabled:opacity-70"
            >
              {loading
                ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-[#191919]" />
                : isKakaoSignup
                  ? <Check size={19} strokeWidth={3} />
                  : <MessageCircle size={20} fill="currentColor" strokeWidth={1.8} />}
              {isKakaoSignup ? "카카오 계정 연결 완료" : "카카오로 간편가입"}
            </button>
            {authError && (
              <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-[#FFF1F1] px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-[#B42318]">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            <button onClick={toggleAll} className="flex items-center gap-3 p-4 rounded-2xl bg-[#f5f5f7] active:opacity-70">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${agree.all ? "bg-[#0071e3] border-[#0071e3]" : "border-[#d2d2d7]"}`}>
                {agree.all && <Check size={13} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[16px] font-bold text-[#1d1d1f]">전체 동의</span>
            </button>
            <div className="mt-2 rounded-2xl border border-[#E5E7EB] bg-white px-3">
              <CheckRow checked={agree.terms} onToggle={() => toggle("terms")} onView={() => setViewingTerm("service")} label="[필수] 이용약관" />
              <CheckRow checked={agree.privacy} onToggle={() => toggle("privacy")} onView={() => setViewingTerm("privacy")} label="[필수] 개인정보처리방침" />
              <CheckRow checked={agree.location} onToggle={() => toggle("location")} onView={() => setViewingTerm("location")} label="[필수] 위치정보 이용약관" />
              <CheckRow checked={agree.marketing} onToggle={() => toggle("marketing")} onView={() => setViewingTerm("marketing")} label="[선택] 마케팅 정보 수신" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={phone} onChange={e => setPhone(formatKoreanMobile(e.target.value))} type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678"
                className="flex-1 h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] outline-none focus:ring-2 focus:ring-[#0071e3]" />
              <button type="button" onClick={sendPhoneCode}
                disabled={phone.replace(/\D/g, "").length !== 11 || loading || remaining > 0}
                className="h-[52px] px-4 rounded-xl bg-[#0071e3] text-white text-[14px] font-bold whitespace-nowrap disabled:opacity-40 active:bg-[#0058b0]">
                {loading ? "전송중..." : codeSent ? (remaining > 0 ? `${remaining}초` : "다시 받기") : "인증번호"}
              </button>
            </div>
            {codeSent && (
              <>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="인증번호 6자리" maxLength={6}
                  className="w-full h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] outline-none focus:ring-2 focus:ring-[#0071e3]" />
                <p className="text-[13px] text-[#0071e3] pl-1">문자로 받은 6자리 번호를 입력해 주세요.</p>
              </>
            )}
            {authError && <div role="alert" className="flex items-start gap-2 rounded-xl bg-[#FFF1F1] px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-[#B42318]"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{authError}</span></div>}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="닉네임 (2~12자)"
              className="w-full h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] outline-none focus:ring-2 focus:ring-[#0071e3]" />
            <div>
              <p className="text-[14px] text-[#6e6e73] mb-2">거주 동네</p>
              <div className="grid grid-cols-3 gap-2">
                {dongs.map(d => (
                  <button key={d} onClick={() => setDong(d)}
                    className={`h-10 rounded-xl text-[14px] font-medium transition-colors active:opacity-70 ${dong === d ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {!isKakaoSignup && phoneVerified && <div className="flex items-center gap-2 rounded-xl bg-[#F0FAF3] px-4 py-3 text-[13px] font-bold text-[#248A3D]"><Check size={16} strokeWidth={3} />휴대폰 본인 인증이 완료됐어요</div>}
          </div>
        )}

        {step === 2 && authError && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF1F1] px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-[#B42318]">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <div className="mt-auto pt-6 pb-8">
          <button onClick={next}
            disabled={
              (step === 0 && (!agree.terms || !agree.privacy || !agree.location)) ||
              (step === 1 && code.length < 6) ||
              (step === 2 && (!nickname || !dong || (!isKakaoSignup && !phoneVerified))) ||
              loading
            }
            className="w-full h-[52px] rounded-xl bg-[#0071e3] text-white text-[17px] font-bold flex items-center justify-center active:bg-[#0058b0] transition-colors disabled:opacity-40">
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : step === 2 ? "가입 완료" : "다음"}
          </button>
        </div>
      </div>

      {viewingTerm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 px-0 backdrop-blur-[2px] sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="약관 닫기"
            onClick={() => setViewingTerm(null)}
            className="absolute inset-0"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-term-title"
            className="relative flex max-h-[84dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
          >
            <div className="flex items-center gap-3 border-b border-[#EDEFF2] px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#2563EB]">
                <FileText size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#86868b]">가입 약관</p>
                <h2 id="signup-term-title" className="truncate text-[17px] font-extrabold text-[#1d1d1f]">
                  {activeTerm?.title ?? "약관 내용을 불러오는 중이에요"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingTerm(null)}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F7] text-[#3d3d3f] active:scale-95"
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {activeTerm ? (
                <>
                  <div className="mb-5 flex items-center gap-2 text-[12px] font-medium text-[#86868b]">
                    <span>버전 {activeTerm.version}</span>
                    <span>·</span>
                    <span>시행일 {activeTerm.effective_date?.slice(0, 10)}</span>
                  </div>
                  <div>{renderTermContent(activeTerm.content)}</div>
                </>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#D7E7FF] border-t-[#2563EB]" />
                  <p className="text-[14px] font-medium text-[#6e6e73]">약관 내용을 불러오고 있어요</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-[0.8fr_1.2fr] gap-2 border-t border-[#EDEFF2] bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => setViewingTerm(null)}
                className="h-12 rounded-xl bg-[#F2F4F7] text-[15px] font-bold text-[#3d3d3f] active:bg-[#E5E7EB]"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={!activeTerm || !activeAgreement}
                onClick={() => activeAgreement && agreeFromDetail(activeAgreement)}
                className="h-12 rounded-xl bg-[#2563EB] text-[15px] font-bold text-white active:bg-[#1D4ED8] disabled:opacity-40"
              >
                동의하고 닫기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
