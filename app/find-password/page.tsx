"use client";
import { useState } from "react";
import { ChevronLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

type Step = "verify" | "reset" | "done";

export default function FindPasswordPage() {
  const [step, setStep] = useState<Step>("verify");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwValid = newPw.length >= 8;
  const pwMatch = newPw === confirmPw && confirmPw.length > 0;

  const sendCode = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setCodeSent(true);
    setLoading(false);
  };

  const verifyAndNext = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setStep("reset");
    setLoading(false);
  };

  const resetPassword = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setStep("done");
    setLoading(false);
  };

  const pwStrength = () => {
    if (newPw.length === 0) return null;
    const hasUpper = /[A-Z]/.test(newPw);
    const hasNum = /[0-9]/.test(newPw);
    const hasSpecial = /[!@#$%^&*]/.test(newPw);
    const score = [newPw.length >= 8, hasUpper, hasNum, hasSpecial].filter(Boolean).length;
    if (score <= 1) return { label: "약함", color: "bg-[#F04452]", w: "w-1/4" };
    if (score === 2) return { label: "보통", color: "bg-[#FF9500]", w: "w-2/4" };
    if (score === 3) return { label: "강함", color: "bg-[#3182F6]", w: "w-3/4" };
    return { label: "매우 강함", color: "bg-[#00C471]", w: "w-full" };
  };
  const strength = pwStrength();

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-[#F2F4F6]">
        {step === "verify"
          ? <Link href="/login/" className="active:opacity-60"><ChevronLeft size={24} className="text-[#191F28]" /></Link>
          : step === "reset"
          ? <button onClick={() => setStep("verify")} className="active:opacity-60"><ChevronLeft size={24} className="text-[#191F28]" /></button>
          : null
        }
        <h1 className="text-[18px] font-bold text-[#191F28]">비밀번호 찾기</h1>
      </div>

      {/* Step bar */}
      {step !== "done" && (
        <div className="px-6 pt-4 pb-0">
          <div className="flex gap-1 mb-1">
            {["verify","reset"].map((s,i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${(step === "verify" ? 0 : 1) >= i ? "bg-[#3182F6]" : "bg-[#F2F4F6]"}`} />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-6 pt-6 flex flex-col">
        {/* Step 1: Verify */}
        {step === "verify" && (
          <>
            <div className="mb-8">
              <div className="w-14 h-14 bg-[#EBF3FE] rounded-2xl flex items-center justify-center text-2xl mb-5">🔐</div>
              <h2 className="text-[23px] font-bold text-[#191F28] leading-snug">
                본인 인증 후<br />비밀번호를 재설정해요
              </h2>
              <p className="text-[15px] text-[#8B95A1] mt-2">가입한 휴대폰 번호로 인증해주세요</p>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="tel" placeholder="휴대폰 번호" value={phone}
                onChange={e => setPhone(e.target.value)}
                className="flex-1 h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[16px] outline-none focus:ring-2 focus:ring-[#3182F6] text-[#191F28] placeholder:text-[#B0B8C1]"
              />
              <button onClick={sendCode} disabled={phone.length < 10 || loading}
                className="h-[52px] px-4 rounded-xl bg-[#3182F6] text-white text-[14px] font-bold whitespace-nowrap disabled:opacity-40 active:bg-[#1B64DA]">
                {loading ? "전송 중..." : codeSent ? "재전송" : "인증번호 받기"}
              </button>
            </div>
            {codeSent && (
              <>
                <div className="relative mb-3">
                  <input type="text" placeholder="인증번호 6자리" value={code}
                    onChange={e => setCode(e.target.value)} maxLength={6}
                    className="w-full h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[16px] outline-none focus:ring-2 focus:ring-[#3182F6] text-[#191F28] placeholder:text-[#B0B8C1]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#F04452]">2:59</span>
                </div>
                <p className="text-[13px] text-[#3182F6]">인증번호가 발송됐어요 (유효시간 3분)</p>
              </>
            )}
            <div className="mt-auto pb-8">
              <button onClick={verifyAndNext} disabled={code.length < 6 || loading}
                className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[17px] font-bold flex items-center justify-center active:bg-[#1B64DA] disabled:opacity-40">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "다음"}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Reset */}
        {step === "reset" && (
          <>
            <div className="mb-8">
              <div className="w-14 h-14 bg-[#EBF3FE] rounded-2xl flex items-center justify-center text-2xl mb-5">✏️</div>
              <h2 className="text-[23px] font-bold text-[#191F28] leading-snug">
                새 비밀번호를<br />설정해주세요
              </h2>
              <p className="text-[15px] text-[#8B95A1] mt-2">8자 이상, 영문·숫자·특수문자 조합 권장</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="새 비밀번호"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full h-[52px] px-4 pr-12 rounded-xl bg-[#F2F4F6] text-[16px] outline-none focus:ring-2 focus:ring-[#3182F6] text-[#191F28] placeholder:text-[#B0B8C1]"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0B8C1]">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Password strength */}
              {strength && (
                <div>
                  <div className="h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.w} rounded-full transition-all`} />
                  </div>
                  <p className={`text-[13px] mt-1 font-medium`}
                    style={{ color: strength.color.replace("bg-","").replace("[","").replace("]","") }}>
                    비밀번호 강도: {strength.label}
                  </p>
                </div>
              )}
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="새 비밀번호 확인"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className={`w-full h-[52px] px-4 pr-12 rounded-xl bg-[#F2F4F6] text-[16px] outline-none text-[#191F28] placeholder:text-[#B0B8C1] ${
                    confirmPw && (pwMatch ? "ring-2 ring-[#00C471]" : "ring-2 ring-[#F04452]")
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0B8C1]">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPw && !pwMatch && (
                <p className="text-[13px] text-[#F04452]">비밀번호가 일치하지 않아요</p>
              )}
              {confirmPw && pwMatch && (
                <p className="text-[13px] text-[#00C471]">비밀번호가 일치해요 ✓</p>
              )}
            </div>
            <div className="mt-auto pb-8">
              <button onClick={resetPassword} disabled={!pwValid || !pwMatch || loading}
                className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[17px] font-bold flex items-center justify-center active:bg-[#1B64DA] disabled:opacity-40">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "비밀번호 재설정"}
              </button>
            </div>
          </>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-20 h-20 bg-[#D1FAE5] rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={44} className="text-[#00C471]" />
            </div>
            <h2 className="text-[25px] font-bold text-[#191F28]">비밀번호 재설정 완료!</h2>
            <p className="text-[15px] text-[#8B95A1] mt-3 leading-relaxed">
              새 비밀번호로 로그인해주세요.<br />
              보안을 위해 이전 비밀번호는 사용할 수 없어요.
            </p>
            <div className="w-full mt-10 flex flex-col gap-3">
              <Link href="/login/"
                className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[16px] font-bold flex items-center justify-center active:bg-[#1B64DA]">
                로그인하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
