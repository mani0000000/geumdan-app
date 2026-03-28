"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors ${on ? "bg-[#3182F6]" : "bg-[#E5E8EB]"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [pushAll, setPushAll] = useState(true);
  const [pushComment, setPushComment] = useState(true);
  const [pushLike, setPushLike] = useState(false);
  const [pushNotice, setPushNotice] = useState(true);
  const [pushMarketing, setPushMarketing] = useState(false);
  const [locationOn, setLocationOn] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-dvh bg-[#F2F4F6]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-[#F2F4F6] bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </button>
        <h1 className="text-[17px] font-bold text-[#191F28]">앱 설정</h1>
      </div>

      <div className="mt-3 space-y-3">
        {/* Push notifications */}
        <div className="bg-white">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#8B95A1]">알림 설정</p>
          {[
            { label: "전체 알림", sub: "모든 알림 on/off", value: pushAll, set: setPushAll },
            { label: "댓글·답글 알림", sub: "내 글/댓글에 새 반응", value: pushComment, set: setPushComment },
            { label: "좋아요 알림", sub: "내 글·댓글 좋아요", value: pushLike, set: setPushLike },
            { label: "공지사항 알림", sub: "검단 라이프 공지", value: pushNotice, set: setPushNotice },
            { label: "마케팅 알림", sub: "이벤트 및 혜택 소식", value: pushMarketing, set: setPushMarketing },
          ].map(({ label, sub, value, set }, i, arr) => (
            <div key={label} className={`flex items-center px-4 py-4 ${i !== arr.length - 1 ? "border-b border-[#F2F4F6]" : ""}`}>
              <div className="flex-1">
                <p className="text-[14px] text-[#191F28] font-medium">{label}</p>
                <p className="text-[12px] text-[#8B95A1] mt-0.5">{sub}</p>
              </div>
              <Toggle on={value} onToggle={() => set(!value)} />
            </div>
          ))}
        </div>

        {/* Privacy */}
        <div className="bg-white">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#8B95A1]">개인정보 보호</p>
          <div className="flex items-center px-4 py-4 border-b border-[#F2F4F6]">
            <div className="flex-1">
              <p className="text-[14px] text-[#191F28] font-medium">위치 정보 사용</p>
              <p className="text-[12px] text-[#8B95A1] mt-0.5">버스·상가 내 위치 기반 서비스</p>
            </div>
            <Toggle on={locationOn} onToggle={() => setLocationOn(!locationOn)} />
          </div>
          {[
            { label: "개인정보 처리방침", href: "#" },
            { label: "서비스 이용약관", href: "#" },
            { label: "위치기반 서비스 이용약관", href: "#" },
          ].map(({ label }, i, arr) => (
            <button key={label} className={`w-full flex items-center px-4 py-4 active:bg-[#F2F4F6] transition-colors ${i !== arr.length - 1 ? "border-b border-[#F2F4F6]" : ""}`}>
              <span className="flex-1 text-[14px] text-[#191F28] text-left">{label}</span>
              <ChevronRight size={16} className="text-[#E5E8EB]" />
            </button>
          ))}
        </div>

        {/* Display */}
        <div className="bg-white">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#8B95A1]">화면 설정</p>
          <div className="flex items-center px-4 py-4">
            <div className="flex-1">
              <p className="text-[14px] text-[#191F28] font-medium">다크 모드</p>
              <p className="text-[12px] text-[#8B95A1] mt-0.5">준비 중인 기능이에요</p>
            </div>
            <Toggle on={darkMode} onToggle={() => setDarkMode(!darkMode)} />
          </div>
        </div>

        {/* App info */}
        <div className="bg-white">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#8B95A1]">앱 정보</p>
          {[
            { label: "버전 정보", value: "v1.0.0 (최신)" },
            { label: "캐시 초기화", value: "12.3 MB" },
            { label: "오픈소스 라이선스", value: "" },
          ].map(({ label, value }, i, arr) => (
            <button key={label} className={`w-full flex items-center px-4 py-4 active:bg-[#F2F4F6] transition-colors ${i !== arr.length - 1 ? "border-b border-[#F2F4F6]" : ""}`}>
              <span className="flex-1 text-[14px] text-[#191F28] text-left">{label}</span>
              <div className="flex items-center gap-1">
                {value && <span className="text-[13px] text-[#8B95A1]">{value}</span>}
                <ChevronRight size={16} className="text-[#E5E8EB]" />
              </div>
            </button>
          ))}
        </div>

        {/* Delete account */}
        <div className="mx-4 mb-6">
          <button className="w-full h-12 bg-white rounded-2xl text-[#F04452] text-[14px] font-medium active:bg-[#FEE2E2] transition-colors">
            회원 탈퇴
          </button>
        </div>
      </div>
    </div>
  );
}
