"use client";
import { useState } from "react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type Step = "input" | "verify" | "result";

export default function FindIdPage() {
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const maskedId = "010****5678"; // mock

  const sendCode = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setCodeSent(true);
    setLoading(false);
  };

  const verify = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setStep("result");
    setLoading(false);
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-[#F2F4F6]">
        <Link href="/login/" className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </Link>
        <h1 className="text-[18px] font-bold text-[#191F28]">아이디 찾기</h1>
      </div>

      <div className="flex-1 px-6 pt-8 flex flex-col">
        {step === "input" && (
          <>
            <div className="mb-8">
              <div className="w-14 h-14 bg-[#EBF3FE] rounded-2xl flex items-center justify-center text-2xl mb-5">📱</div>
              <h2 className="text-[23px] font-bold text-[#191F28] leading-snug">
                가입 시 등록한<br />휴대폰 번호를 입력해주세요
              </h2>
              <p className="text-[15px] text-[#8B95A1] mt-2">본인 인증 후 아이디를 확인할 수 있어요</p>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="tel"
                placeholder="휴대폰 번호 (- 없이 입력)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="flex-1 h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[16px] outline-none focus:ring-2 focus:ring-[#3182F6] text-[#191F28] placeholder:text-[#B0B8C1]"
              />
              <button
                onClick={sendCode}
                disabled={phone.length < 10 || loading}
                className="h-[52px] px-4 rounded-xl bg-[#3182F6] text-white text-[14px] font-bold whitespace-nowrap disabled:opacity-40 active:bg-[#1B64DA] transition-colors"
              >
                {loading ? "전송 중..." : codeSent ? "재전송" : "인증번호 받기"}
              </button>
            </div>
            {codeSent && (
              <>
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="인증번호 6자리"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    maxLength={6}
                    className="w-full h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[16px] outline-none focus:ring-2 focus:ring-[#3182F6] text-[#191F28] placeholder:text-[#B0B8C1]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#F04452]">2:59</span>
                </div>
                <p className="text-[13px] text-[#3182F6] mb-4">인증번호가 발송됐어요 (유효시간 3분)</p>
              </>
            )}
            <div className="mt-auto pb-8">
              <button
                onClick={verify}
                disabled={code.length < 6 || loading}
                className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[17px] font-bold flex items-center justify-center active:bg-[#1B64DA] transition-colors disabled:opacity-40"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "확인"}
              </button>
            </div>
          </>
        )}

        {step === "result" && (
          <div className="flex flex-col items-center text-center pt-6">
            <div className="w-16 h-16 bg-[#EBF3FE] rounded-full flex items-center justify-center mb-5">
              <CheckCircle2 size={36} className="text-[#3182F6]" />
            </div>
            <h2 className="text-[23px] font-bold text-[#191F28]">아이디를 찾았어요</h2>
            <p className="text-[15px] text-[#8B95A1] mt-2 mb-8">{phone} 로 가입된 계정이에요</p>

            <div className="w-full bg-[#F2F4F6] rounded-2xl px-6 py-5 mb-8">
              <p className="text-[14px] text-[#8B95A1] mb-2">가입된 아이디</p>
              <p className="text-[23px] font-black text-[#3182F6]">{maskedId}</p>
              <p className="text-[13px] text-[#B0B8C1] mt-2">보안을 위해 일부 번호는 가려져요</p>
            </div>

            <p className="text-[14px] text-[#8B95A1] mb-6">
              검단 라이프는 <span className="font-bold text-[#191F28]">휴대폰 번호</span>로 로그인해요
            </p>

            <div className="w-full flex flex-col gap-3">
              <Link href="/login/"
                className="w-full h-[52px] rounded-xl bg-[#3182F6] text-white text-[16px] font-bold flex items-center justify-center active:bg-[#1B64DA] transition-colors">
                로그인하기
              </Link>
              <Link href="/find-password/"
                className="w-full h-[52px] rounded-xl bg-[#F2F4F6] text-[#4E5968] text-[16px] font-bold flex items-center justify-center active:opacity-70 transition-opacity">
                비밀번호 찾기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
