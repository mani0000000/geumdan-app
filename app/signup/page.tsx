"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Eye, EyeOff, X } from "lucide-react";
import Link from "next/link";

const PW_RULES = [
  { label: "8자 이상",          test: (v: string) => v.length >= 8 },
  { label: "영문 소문자 포함",  test: (v: string) => /[a-z]/.test(v) },
  { label: "영문 대문자 포함",  test: (v: string) => /[A-Z]/.test(v) },
  { label: "숫자 포함",         test: (v: string) => /[0-9]/.test(v) },
  { label: "특수문자 포함",     test: (v: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) },
];

const steps = ["약관 동의", "본인 인증", "프로필 설정"];
import { DONG_SELECT_OPTIONS } from "@/lib/geumdan";
const dongs = DONG_SELECT_OPTIONS;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [agree, setAgree] = useState({ all: false, terms: false, privacy: false, location: false, marketing: false });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [nickname, setNickname] = useState("");
  const [dong, setDong] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwRulesPassed = PW_RULES.every(r => r.test(pw));
  const pwMatch = pw.length > 0 && pwConfirm.length > 0 && pw === pwConfirm;

  const toggleAll = () => {
    const v = !agree.all;
    setAgree({ all: v, terms: v, privacy: v, location: v, marketing: v });
  };
  const toggle = (k: keyof typeof agree) => {
    const u = { ...agree, [k]: !agree[k] };
    u.all = u.terms && u.privacy && u.location && u.marketing;
    setAgree(u);
  };

  const next = async () => {
    if (step === 2) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      router.push("/home/");
    } else setStep(s => s + 1);
  };

  const CheckRow = ({ k, label, detailType }: { k: keyof typeof agree; label: string; detailType?: string }) => (
    <div className="flex items-center gap-3 py-3">
      <button onClick={() => toggle(k)} className="flex items-center gap-3 flex-1 active:opacity-70 text-left">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${agree[k] ? "bg-[#0071e3] border-[#0071e3]" : "border-[#d2d2d7]"}`}>
          {agree[k] && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
        <span className="text-[15px] text-[#1d1d1f]">{label}</span>
      </button>
      {detailType && (
        <Link href={`/terms/${detailType}`} className="text-[13px] text-[#0071e3] font-semibold shrink-0 active:opacity-60">
          보기
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14">
        {step > 0
          ? <button onClick={() => setStep(s => s - 1)} className="active:opacity-60"><ChevronLeft size={24} className="text-[#1d1d1f]" /></button>
          : <Link href="/login/" className="active:opacity-60"><ChevronLeft size={24} className="text-[#1d1d1f]" /></Link>
        }
      </div>

      {/* Progress */}
      <div className="px-6 pb-0">
        <div className="flex gap-1 mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#0071e3]" : "bg-[#d2d2d7]"}`} />
          ))}
        </div>
        <p className="text-[13px] text-[#6e6e73] mb-1">{step + 1} / {steps.length}</p>
        <h2 className="text-[23px] font-bold text-[#1d1d1f] leading-snug mb-6">
          {step === 0 && "약관에 동의해 주세요"}
          {step === 1 && "본인 인증을 해 주세요"}
          {step === 2 && "검단 어디에 사세요?"}
        </h2>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        {step === 0 && (
          <div className="flex flex-col gap-1">
            <button onClick={toggleAll} className="flex items-center gap-3 p-4 rounded-2xl bg-[#f5f5f7] active:opacity-70">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${agree.all ? "bg-[#0071e3] border-[#0071e3]" : "border-[#d2d2d7]"}`}>
                {agree.all && <Check size={13} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[16px] font-bold text-[#1d1d1f]">전체 동의</span>
            </button>
            <div className="mt-2 px-1">
              <CheckRow k="terms" label="[필수] 이용약관" detailType="service" />
              <CheckRow k="privacy" label="[필수] 개인정보처리방침" detailType="privacy" />
              <CheckRow k="location" label="[필수] 위치정보 이용약관" detailType="location" />
              <CheckRow k="marketing" label="[선택] 마케팅 정보 수신" detailType="marketing" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="휴대폰 번호"
                className="flex-1 h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] outline-none focus:ring-2 focus:ring-[#0071e3]" />
              <button onClick={async () => { setLoading(true); await new Promise(r=>setTimeout(r,800)); setCodeSent(true); setLoading(false); }}
                disabled={phone.length < 10 || loading}
                className="h-[52px] px-4 rounded-xl bg-[#0071e3] text-white text-[14px] font-bold whitespace-nowrap disabled:opacity-40 active:bg-[#0058b0]">
                {loading ? "전송중..." : "인증번호"}
              </button>
            </div>
            {codeSent && (
              <>
                <input value={code} onChange={e => setCode(e.target.value)} type="text" placeholder="인증번호 6자리" maxLength={6}
                  className="w-full h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] outline-none focus:ring-2 focus:ring-[#0071e3]" />
                <p className="text-[13px] text-[#0071e3] pl-1">인증번호가 발송됐어요 (유효시간 3분)</p>
              </>
            )}
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
            {/* 비밀번호 */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <input
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  type={showPw ? "text" : "password"}
                  placeholder="비밀번호"
                  className="w-full h-[52px] px-4 pr-12 rounded-xl bg-[#f5f5f7] text-[16px] outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#86868b] active:opacity-60"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* 비밀번호 규칙 */}
              {pw.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-1 pt-1">
                  {PW_RULES.map(r => {
                    const ok = r.test(pw);
                    return (
                      <div key={r.label} className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-[#34C759]" : "bg-[#f0f0f3]"}`}>
                          {ok
                            ? <Check size={9} className="text-white" strokeWidth={3} />
                            : <X size={9} className="text-[#c7c7cc]" strokeWidth={3} />}
                        </div>
                        <span className={`text-[12px] ${ok ? "text-[#34C759]" : "text-[#86868b]"}`}>{r.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <input
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  type={showPwConfirm ? "text" : "password"}
                  placeholder="비밀번호 확인"
                  className={`w-full h-[52px] px-4 pr-12 rounded-xl text-[16px] outline-none focus:ring-2 ${
                    pwConfirm.length > 0 && !pwMatch
                      ? "bg-[#FEF2F2] focus:ring-[#F04452] ring-1 ring-[#F04452]"
                      : pwMatch
                      ? "bg-[#F0FDF4] focus:ring-[#34C759] ring-1 ring-[#34C759]"
                      : "bg-[#f5f5f7] focus:ring-[#0071e3]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#86868b] active:opacity-60"
                >
                  {showPwConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {pwConfirm.length > 0 && (
                <p className={`text-[12px] pl-1 ${pwMatch ? "text-[#34C759]" : "text-[#F04452]"}`}>
                  {pwMatch ? "비밀번호가 일치해요" : "비밀번호가 일치하지 않아요"}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto pt-6 pb-8">
          <button onClick={next}
            disabled={
              (step === 0 && (!agree.terms || !agree.privacy || !agree.location)) ||
              (step === 1 && code.length < 6) ||
              (step === 2 && (!nickname || !dong || !pwRulesPassed || !pwMatch)) ||
              loading
            }
            className="w-full h-[52px] rounded-xl bg-[#0071e3] text-white text-[17px] font-bold flex items-center justify-center active:bg-[#0058b0] transition-colors disabled:opacity-40">
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : step === 2 ? "가입 완료" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
