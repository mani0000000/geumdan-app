"use client";
import { useState, useEffect } from "react";
import { User, Save, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import {
  fetchMypageWidgetConfig,
  adminSaveMypageWidgetConfig,
  MYPAGE_WIDGET_DEFAULT,
  type MypageWidgetConfig,
  type MypageWidgetKey,
} from "@/lib/db/site-settings";

const WIDGET_LABELS: { key: MypageWidgetKey; label: string; desc: string; emoji: string }[] = [
  { key: "profile",        emoji: "👤", label: "프로필 카드",      desc: "닉네임·레벨·작성글/댓글/좋아요 통계" },
  { key: "points",         emoji: "🏆", label: "포인트 & 월간 레벨", desc: "보유 포인트, 이번 달 등급, 포인트 내역" },
  { key: "missions",       emoji: "⚡", label: "주간 미션",         desc: "미션 완료 시 포인트 지급" },
  { key: "rewards",        emoji: "🎁", label: "포인트 교환",       desc: "포인트로 쿠폰·상품 교환" },
  { key: "recent_posts",   emoji: "📝", label: "최근 작성글",       desc: "내가 쓴 최근 글 목록" },
  { key: "menu_activity",  emoji: "📊", label: "나의 활동 메뉴",    desc: "작성글·댓글·쿠폰·저장글 바로가기" },
  { key: "menu_favorites", emoji: "⭐", label: "즐겨찾기 메뉴",     desc: "즐겨찾는 버스·매장·아파트" },
  { key: "menu_settings",  emoji: "⚙️", label: "설정/기타 메뉴",   desc: "알림·약관·고객센터 등" },
];

export default function AdminMypagePage() {
  const [cfg, setCfg] = useState<MypageWidgetConfig>({ ...MYPAGE_WIDGET_DEFAULT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchMypageWidgetConfig().then(c => {
      setCfg(c);
      setLoading(false);
    });
  }, []);

  function toggle(key: MypageWidgetKey) {
    setCfg(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true); setErr(""); setSaved(false);
    try {
      await adminSaveMypageWidgetConfig(cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(String(e));
    }
    setSaving(false);
  }

  const visibleCount = Object.values(cfg).filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28] flex items-center gap-2">
          <User size={20} className="text-[#3182F6]" /> 마이페이지 위젯 관리
        </h1>
        <p className="text-[13px] text-[#8B95A1] mt-0.5">
          마이페이지에 노출할 위젯을 선택합니다. 비활성화한 위젯은 앱에서 숨겨집니다.
        </p>
      </div>

      {/* 요약 배지 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[13px] font-bold text-[#3182F6] bg-[#EFF6FF] px-3 py-1.5 rounded-full">
          {visibleCount}/{WIDGET_LABELS.length}개 노출 중
        </span>
        {saved && (
          <span className="text-[13px] font-bold text-[#00C471] bg-[#F0FDF4] px-3 py-1.5 rounded-full animate-fade-in">
            저장됨 ✓
          </span>
        )}
      </div>

      {/* 위젯 목록 */}
      <div className="bg-white rounded-2xl border border-[#E5E8EB] divide-y divide-[#F2F4F6]">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-[#F2F4F6]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-[#F2F4F6] rounded" />
                <div className="h-3 w-48 bg-[#F2F4F6] rounded" />
              </div>
              <div className="w-10 h-6 rounded-full bg-[#F2F4F6]" />
            </div>
          ))
        ) : (
          WIDGET_LABELS.map(({ key, emoji, label, desc }) => {
            const on = cfg[key];
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#FAFBFC] transition-colors text-left"
              >
                {/* 아이콘 */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0 transition-colors ${
                  on ? "bg-[#EFF6FF]" : "bg-[#F2F4F6]"
                }`}>
                  {emoji}
                </div>

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-bold transition-colors ${on ? "text-[#191F28]" : "text-[#8B95A1]"}`}>
                    {label}
                  </p>
                  <p className="text-[12px] text-[#8B95A1] mt-0.5 truncate">{desc}</p>
                </div>

                {/* 토글 */}
                <div className="shrink-0">
                  {on ? (
                    <ToggleRight size={28} className="text-[#3182F6]" />
                  ) : (
                    <ToggleLeft size={28} className="text-[#D1D5DB]" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {err && <p className="mt-3 text-[12px] text-[#F04452]">{err}</p>}

      {/* 저장 버튼 */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold disabled:opacity-50 hover:bg-[#2563EB] transition-colors"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "저장됨 ✓" : saving ? "저장 중..." : "설정 저장"}
        </button>
        <button
          onClick={() => { setCfg({ ...MYPAGE_WIDGET_DEFAULT }); setSaved(false); }}
          disabled={saving || loading}
          className="px-4 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6] disabled:opacity-50 transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
