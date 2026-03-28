"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

const steps = ["약관 동의", "본인 인증", "정보 입력", "완료"];

const dongs = [
  "당하동", "불로동", "마전동", "왕길동", "오류동",
  "검단동", "신현동", "경서동", "청라동",
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    location: false,
    marketing: false,
  });
  const [phone, setPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [nickname, setNickname] = useState("");
  const [selectedDong, setSelectedDong] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleAll = () => {
    const newVal = !agreements.all;
    setAgreements({ all: newVal, terms: newVal, privacy: newVal, location: newVal, marketing: newVal });
  };

  const toggle = (key: keyof typeof agreements) => {
    const updated = { ...agreements, [key]: !agreements[key] };
    updated.all = updated.terms && updated.privacy && updated.location && updated.marketing;
    setAgreements(updated);
  };

  const handleSendCode = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCodeSent(true);
    setLoading(false);
  };

  const handleNext = async () => {
    if (step === steps.length - 2) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      setLoading(false);
    }
    if (step < steps.length - 1) setStep(step + 1);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-[20px] font-bold text-gray-900">서비스 약관에 동의해주세요</h2>
            <button
              onClick={toggleAll}
              className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-xl press-effect"
            >
              {agreements.all ? (
                <CheckCircle2 size={24} className="text-blue-600 shrink-0" />
              ) : (
                <Circle size={24} className="text-gray-300 shrink-0" />
              )}
              <span className="text-[15px] font-semibold text-gray-900">전체 동의</span>
            </button>
            <div className="space-y-1">
              {[
                { key: "terms", label: "[필수] 이용약관", required: true },
                { key: "privacy", label: "[필수] 개인정보처리방침", required: true },
                { key: "location", label: "[필수] 위치정보 이용약관", required: true },
                { key: "marketing", label: "[선택] 마케팅 정보 수신 동의", required: false },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggle(key as keyof typeof agreements)}
                  className="w-full flex items-center gap-3 px-2 py-3 press-effect"
                >
                  {agreements[key as keyof typeof agreements] ? (
                    <CheckCircle2 size={20} className="text-blue-600 shrink-0" />
                  ) : (
                    <Circle size={20} className="text-gray-300 shrink-0" />
                  )}
                  <span className="text-[14px] text-gray-700">{label}</span>
                </button>
              ))}
            </div>
            <button
              disabled={!agreements.terms || !agreements.privacy || !agreements.location}
              onClick={handleNext}
              className="w-full h-[52px] gradient-primary rounded-xl text-white font-semibold text-[16px] flex items-center justify-center press-effect disabled:opacity-40 mt-4"
            >
              다음
            </button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-[20px] font-bold text-gray-900">휴대폰으로 본인을 인증해주세요</h2>
            <p className="text-sm text-gray-500">1인 1계정 원칙을 위해 본인 인증이 필요합니다.</p>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="휴대폰 번호 입력"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 h-[52px] px-4 rounded-xl border border-gray-200 text-[15px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendCode}
                disabled={phone.length < 10 || loading}
                className="h-[52px] px-4 gradient-primary rounded-xl text-white font-semibold text-[13px] whitespace-nowrap press-effect disabled:opacity-40"
              >
                {loading ? "전송 중..." : "인증번호 발송"}
              </button>
            </div>
            {codeSent && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="인증번호 6자리"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    maxLength={6}
                    className="flex-1 h-[52px] px-4 rounded-xl border border-gray-200 text-[15px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="h-[52px] px-4 border border-gray-200 rounded-xl text-gray-600 font-semibold text-[13px] whitespace-nowrap press-effect">
                    재발송
                  </button>
                </div>
                <p className="text-xs text-blue-600 pl-1">인증번호가 발송되었습니다. (유효시간 3분)</p>
              </div>
            )}
            <button
              disabled={verifyCode.length < 6}
              onClick={handleNext}
              className="w-full h-[52px] gradient-primary rounded-xl text-white font-semibold text-[16px] press-effect disabled:opacity-40 mt-4"
            >
              인증 확인
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-[20px] font-bold text-gray-900">검단 어디에 사세요?</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">닉네임</label>
              <input
                type="text"
                placeholder="닉네임 (2~12자)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full h-[52px] px-4 rounded-xl border border-gray-200 text-[15px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">거주 동</label>
              <div className="grid grid-cols-3 gap-2">
                {dongs.map((dong) => (
                  <button
                    key={dong}
                    onClick={() => setSelectedDong(dong)}
                    className={`h-10 rounded-xl text-[13px] font-medium press-effect ${
                      selectedDong === dong
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {dong}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호 (8자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[52px] px-4 rounded-xl border border-gray-200 text-[15px] bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              disabled={!nickname || !selectedDong || password.length < 8 || loading}
              onClick={handleNext}
              className="w-full h-[52px] gradient-primary rounded-xl text-white font-semibold text-[16px] press-effect disabled:opacity-40"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : "가입 완료"}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center text-center pt-8 space-y-4">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} className="text-blue-600" />
            </div>
            <h2 className="text-[22px] font-bold text-gray-900">가입 완료!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              검단 라이프 회원이 되신 걸 환영합니다.<br />
              이웃들과 소통하며 검단 생활을 즐겨보세요!
            </p>
            <button
              onClick={() => router.push("/home")}
              className="w-full h-[52px] gradient-primary rounded-xl text-white font-semibold text-[16px] press-effect mt-4"
            >
              시작하기
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 h-14 border-b border-gray-100">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="press-effect">
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
        ) : (
          <Link href="/login" className="press-effect">
            <ChevronLeft size={24} className="text-gray-700" />
          </Link>
        )}
        <span className="ml-2 text-[16px] font-semibold text-gray-900">회원가입</span>
      </div>

      {/* Step Indicator */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
              <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                i <= step ? "bg-blue-600" : "bg-gray-200"
              }`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{step + 1} / {steps.length} 단계 · {steps[step]}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-6 pb-10">
        {renderStep()}
      </div>
    </div>
  );
}
