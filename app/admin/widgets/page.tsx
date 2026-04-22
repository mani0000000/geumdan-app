"use client";
import { useEffect, useState } from "react";
import {
  LayoutGrid, ChevronUp, ChevronDown, Save, RefreshCw,
  Eye, EyeOff, GripVertical, CheckCircle2, AlertCircle,
  Sun, Cloud, MenuSquare, Tag, Store, ShoppingBag, PillBottle, Bus, Newspaper,
  Smile, Image,
} from "lucide-react";
import {
  adminFetchWidgetConfig,
  adminSaveWidgetConfig,
  DEFAULT_WIDGETS,
  type WidgetConfig,
} from "@/lib/db/widget-config";

// 위젯별 아이콘 및 색상 메타데이터
const WIDGET_META: Record<string, { icon: React.ElementType; color: string; bg: string; desc: string }> = {
  greeting:  { icon: Smile,       color: "#F59E0B", bg: "#FEF3C7", desc: "사용자 이름 + 날씨 기반 인사말" },
  banners:   { icon: Image,       color: "#FF6B35", bg: "#FFF0E8", desc: "이번 주 행사·프로모션 배너 캐러셀" },
  weather:   { icon: Sun,         color: "#3182F6", bg: "#EBF3FE", desc: "현재 날씨 · 시간별 · 주간 예보" },
  quickmenu: { icon: MenuSquare,  color: "#6366F1", bg: "#EDE9FE", desc: "버스, 부동산, 뉴스 등 바로가기" },
  coupons:   { icon: Tag,         color: "#F97316", bg: "#FFF3E0", desc: "이번 주 쿠폰 가로 스크롤 목록" },
  openings:  { icon: Store,       color: "#F04452", bg: "#FEE2E2", desc: "신규 오픈 매장 · 오픈 혜택 안내" },
  mart:      { icon: ShoppingBag, color: "#059669", bg: "#D1FAE5", desc: "주변 마트 영업 여부 (주말만 표시)" },
  pharmacy:  { icon: PillBottle,  color: "#8B5CF6", bg: "#EDE9FE", desc: "약국 · 응급실 · 소아응급실" },
  transport: { icon: Bus,         color: "#0EA5E9", bg: "#E0F2FE", desc: "가까운 버스정류장 도착 정보" },
  sosik:     { icon: Newspaper,   color: "#00C471", bg: "#D1FAE5", desc: "커뮤니티 HOT · 뉴스 · 부동산 시세" },
};

type SaveState = "idle" | "saving" | "ok" | "err";

export default function WidgetsAdminPage() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    adminFetchWidgetConfig()
      .then(data => {
        // DEFAULT_WIDGETS에 없는 DB 행이 있으면 무시하고, 빠진 항목은 끝에 추가
        const merged = DEFAULT_WIDGETS.map(def => {
          const db = data.find(d => d.id === def.id);
          return db ?? def;
        });
        setWidgets(merged.sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch(() => setWidgets([...DEFAULT_WIDGETS]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
    setDirty(true);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...widgets];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setWidgets(next);
    setDirty(true);
  }

  async function save() {
    setSaveState("saving");
    setErrMsg("");
    try {
      await adminSaveWidgetConfig(widgets);
      setSaveState("ok");
      setDirty(false);
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      setErrMsg((e as Error).message);
      setSaveState("err");
    }
  }

  function reset() {
    setWidgets([...DEFAULT_WIDGETS]);
    setDirty(true);
  }

  const enabledCount = widgets.filter(w => w.enabled).length;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
            <LayoutGrid size={18} className="text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-[18px] font-extrabold text-[#191F28]">홈 위젯 구성</h1>
            <p className="text-[12px] text-[#8B95A1] mt-0.5">
              위젯 활성화·순서를 설정하면 홈 화면에 바로 반영돼요
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="h-9 px-3 rounded-xl bg-[#F2F4F6] text-[13px] font-semibold text-[#4E5968] flex items-center gap-1.5 hover:bg-[#E5E8EB] transition-colors">
            <RefreshCw size={13} />
            초기화
          </button>
          <button
            onClick={save}
            disabled={saveState === "saving" || !dirty}
            className={`h-9 px-4 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors
              ${!dirty ? "bg-[#F2F4F6] text-[#B0B8C1] cursor-not-allowed"
              : saveState === "saving" ? "bg-[#6366F1]/70 text-white cursor-wait"
              : "bg-[#6366F1] text-white hover:bg-[#4F46E5]"}`}>
            {saveState === "saving"
              ? <><RefreshCw size={13} className="animate-spin" />저장 중</>
              : saveState === "ok"
              ? <><CheckCircle2 size={13} />저장됨</>
              : <><Save size={13} />저장하기</>}
          </button>
        </div>
      </div>

      {/* 오류 배너 */}
      {saveState === "err" && (
        <div className="mb-4 flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-[#F04452] shrink-0" />
          <span className="text-[13px] text-[#F04452]">{errMsg || "저장에 실패했어요"}</span>
        </div>
      )}

      {/* 요약 칩 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[13px] font-semibold text-[#8B95A1]">
          전체 {widgets.length}개 위젯 중
        </span>
        <span className="text-[13px] font-bold text-[#6366F1] bg-[#EDE9FE] px-2.5 py-0.5 rounded-full">
          {enabledCount}개 활성화
        </span>
        <span className="text-[13px] text-[#B0B8C1]">·</span>
        <span className="text-[13px] text-[#B0B8C1]">{widgets.length - enabledCount}개 숨김</span>
      </div>

      {/* 위젯 목록 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-[72px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {widgets.map((w, idx) => {
            const meta = WIDGET_META[w.id];
            const Icon = meta?.icon ?? LayoutGrid;

            return (
              <div key={w.id}
                className={`bg-white rounded-2xl flex items-center gap-3 px-4 py-3.5 transition-all
                  ${w.enabled ? "shadow-sm" : "opacity-50"}`}>

                {/* 순서 핸들 (아이콘) */}
                <GripVertical size={16} className="text-[#D0D5DD] shrink-0" />

                {/* 순서 번호 */}
                <span className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center shrink-0
                  ${w.enabled ? "bg-[#6366F1] text-white" : "bg-[#E5E8EB] text-[#B0B8C1]"}`}>
                  {idx + 1}
                </span>

                {/* 위젯 아이콘 */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: meta?.bg ?? "#F2F4F6" }}>
                  <Icon size={17} style={{ color: meta?.color ?? "#8B95A1" }} />
                </div>

                {/* 라벨 + 설명 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-bold ${w.enabled ? "text-[#191F28]" : "text-[#8B95A1]"}`}>
                    {w.label}
                  </p>
                  <p className="text-[12px] text-[#B0B8C1] truncate">{meta?.desc ?? ""}</p>
                </div>

                {/* 토글 */}
                <button
                  onClick={() => toggle(w.id)}
                  title={w.enabled ? "비활성화" : "활성화"}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                    ${w.enabled
                      ? "bg-[#EBF3FE] hover:bg-[#DBEAFE] text-[#3182F6]"
                      : "bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#B0B8C1]"}`}>
                  {w.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>

                {/* 순서 이동 */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center hover:bg-[#E5E8EB] disabled:opacity-30 transition-colors">
                    <ChevronUp size={13} className="text-[#4E5968]" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === widgets.length - 1}
                    className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center hover:bg-[#E5E8EB] disabled:opacity-30 transition-colors">
                    <ChevronDown size={13} className="text-[#4E5968]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 안내 */}
      <div className="mt-6 bg-[#F8F9FB] rounded-2xl px-4 py-4">
        <p className="text-[13px] font-bold text-[#4E5968] mb-2">사용 안내</p>
        <ul className="space-y-1.5">
          {[
            "눈 아이콘으로 위젯을 켜거나 끌 수 있어요",
            "위·아래 화살표로 홈 화면의 위젯 순서를 바꿀 수 있어요",
            "저장하기를 누르면 홈 화면에 즉시 반영돼요",
            "주변 마트 위젯은 주말에만 자동으로 표시돼요 (활성화 시)",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[11px] font-black text-[#6366F1] mt-0.5">•</span>
              <span className="text-[12px] text-[#6B7684]">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
