"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import Link from "next/link";

const steps = ["약관 동의", "본인 인증", "프로필 설정"];
const dongs = ["당하동","불로동","마전동","왕길동","오류동","검단동","신현동","경서동","청라동"];

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
  const [loading, setLoading] = useState(false);

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

  const CheckRow = ({ k, label }: { k: keyof typeof agree; label: string }) => (
    <button onClick={() => toggle(k)} className="w-full flex items-center gap-3 py-3 active:opacity-70">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${agree[k] ? "bg-[#3182F6] border-[#3182F6]" : "border-[#E5E8EB]"}`}>
        {agree[k] && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>
      <span className="text-[14px] text-[#191F28]">{label}</span>
    </button>
  );

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14">
        {step > 0
          ? <button onClick={() => setStep(s => s - 1)} className="active:opacity-60"><ChevronLeft size={24} className="text-[#191F28]" /></button>
          : <Link href="/login/" className="active:opacity-60"><ChevronLeft size={24} className="text-[#191F28]" /></Link>
        }
      </div>

      {/* Progress */}
      <div className="px-6 pb-0">
        <div className="flex gap-1 mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#3182F6]" : "bg-[#E5E8EB]"}`} />
          ))}
        </div>
        <p className="text-[12px] text-[#8B95A1] mb-1">{step + 1} / {steps.length}</p>
        <h2 className="text-[22px] font-bold text-[#191F28] leading-snug mb-6">
          {step === 0 && "약관에 동의해 주세요"}
          {step === 1 && "본인 인증을 해 주세요"}
          {step === 2 && "검단 어디에 사세요?"}
        </h2>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        {step === 0 && (
          <div className="flex flex-col gap-1">
            <button onClick={toggleAll} className="flex items-center gap-3 p-4 rounded-2xl bg-[#F2F4F6] active:opacity-70">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${agree.all ? "bg-[#3182F6] border-[#3182F6]" : "border-[#E5E8EB]"}`}>
                {agree.all && <Check size={13} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[15px] font-bold text-[#191F28]">전체 동의</span>
            </button>
            <div className="mt-2 px-1">
              <CheckRow k="terms" label="[필수] 이용약관" />
              <CheckRow k="privacy" label="[필수] 개인정보처리방침" />
              <CheckRow k="location" label="[필수] 위치정보 이용약관" />
              <CheckRow k="marketing" label="[선택] 마케팅 정보 수신" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="휴대폰 번호"
                className="flex-1 h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[15px] outline-none focus:ring-2 focus:ring-[#3182F6]" />
              <button onClick={async () => { setLoading(true); await new Promise(r=>setTimeout(r,800)); setCodeSent(true); setLoading(false); }}
                disabled={phone.length < 10 || loading}
                className="h-[52px] px-4 rounded-xl bg-[#3182F6] text-white text-[13px] font-bold whitespace-nowrap disabled:opacity-40 active:bg-[#1B64DA]">
                {loading ? "전송중..." : "인증번호"}
              </button>
            </div>
            {codeSent && (
              <>
                <input value={code} onChange={e => setCode(e.target.value)} type="text" placeholder="인증번호 6자리" maxLength={6}
                  className="w-full h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[15px] outline-none focus:ring-2 focus:ring-[#3182F6]" />
                <p className="text-[12px] text-[#3182F6] pl-1">인증번호가 발송됐어요 (유효시간 3분)</p>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="닉네임 (2~12자)"
              className="w-full h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[15px] outline-none focus:ring-2 focus:ring-[#3182F6]" />
            <div>
              <p className="text-[13px] text-[#8B95A1] mb-2">거주 동네</p>
              <div className="grid grid-cols-3 gap-2">
                {dongs.map(d => (
                  <button key={d} onClick={() => setDong(d)}
                    className={`h-10 rounded-xl text-[13px] font-medium transition-colors active:opacity-70 ${dong === d ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#191F28]"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="비밀번호 (8자 이상)"
              className="w-full h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[15px] outline-none focus:ring-2 focus:ring-[#3182F6]" />
          </div>
        )}

        <div className="mt-auto pt-6 pb-8">
          <button onClick={next}
            disabled={
              (step === 0 && (!agree.terms || !agree.privacy || !agree.location)) ||
              (step === 1 && code.length < 6) ||
              (step === 2 && (!nickname || !dong || pw.length < 8)) ||
              loading
            }
            className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[16px] font-bold flex items-center justify-center active:bg-[#1B64DA] transition-colors disabled:opacity-40">
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : step === 2 ? "가입 완료" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
