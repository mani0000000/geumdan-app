"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getUserSettings,
  updateUserSettings,
  type UserSettings,
} from "@/lib/db/userdata";

function Toggle({
  on, onToggle, disabled,
}: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        on ? "bg-[#2563EB]" : "bg-[#d2d2d7]"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    getUserSettings().then(setSettings);
  }, []);

  const set = (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    updateUserSettings(patch);
  };

  const allOn = settings?.push_all ?? true;

  const rows: { key: keyof UserSettings; label: string; sub: string }[] = [
    { key: "push_comment",   label: "댓글·답글 알림", sub: "내 글에 새 댓글이 달릴 때" },
    { key: "push_like",      label: "좋아요 알림",   sub: "내 글·댓글에 좋아요" },
    { key: "push_notice",    label: "공지사항 알림", sub: "검단 라이프 공지" },
    { key: "push_marketing", label: "마케팅 알림",   sub: "이벤트 및 혜택 소식" },
  ];

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2 h-[52px] px-4">
          <button onClick={() => router.back()} aria-label="뒤로" className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">알림 설정</h1>
        </div>
      </header>

      <div className="px-5 pt-5 pb-10 space-y-5">
        {/* 전체 알림 카드 */}
        <div className="bg-[#2563EB]/[0.06] rounded-2xl p-5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#1d1d1f]">전체 알림</p>
            <p className="text-[12px] text-[#6e6e73] mt-1 leading-relaxed">
              모든 푸시 알림을 한 번에 켜거나 끌 수 있어요.
            </p>
          </div>
          <Toggle
            on={allOn}
            onToggle={() => set({ push_all: !allOn })}
          />
        </div>

        {/* 개별 알림 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#86868b]">개별 알림</p>
          {rows.map((r, i) => (
            <div
              key={r.key}
              className={`flex items-center px-4 py-4 ${
                i !== rows.length - 1 ? "border-b border-[#f0f0f3]" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#1d1d1f]">{r.label}</p>
                <p className="text-[12px] text-[#86868b] mt-0.5">{r.sub}</p>
              </div>
              <Toggle
                on={Boolean(settings?.[r.key]) && allOn}
                disabled={!allOn}
                onToggle={() => set({ [r.key]: !settings?.[r.key] } as Partial<UserSettings>)}
              />
            </div>
          ))}
        </div>

        {/* 위치 정보 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-[12px] font-bold text-[#86868b]">위치 정보</p>
          <div className="flex items-center px-4 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#1d1d1f]">위치 기반 서비스</p>
              <p className="text-[12px] text-[#86868b] mt-0.5">버스·상가 추천에 사용해요</p>
            </div>
            <Toggle
              on={Boolean(settings?.location_on)}
              onToggle={() => set({ location_on: !settings?.location_on })}
            />
          </div>
        </div>

        <p className="text-[11px] text-[#86868b] leading-relaxed text-center px-4">
          야간(오후 10시 ~ 오전 7시)에는 긴급 공지를 제외한 알림이 전송되지 않아요.
        </p>
      </div>
    </div>
  );
}
