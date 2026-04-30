"use client";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronLeft, RefreshCw, Check, X } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchBuildings, adminUpdateBuilding,
  adminFetchFloors, adminCreateFloor, adminUpdateFloor, adminDeleteFloor,
  adminFetchStores, adminCreateStore, adminUpdateStore, adminDeleteStore,
  type AdminBuilding, type AdminFloor, type AdminStore,
} from "@/lib/db/admin-stores";
import type { StoreCategory } from "@/lib/types";

// ─── 상수 ────────────────────────────────────────────────────
const CATS: StoreCategory[] = [
  "카페", "음식점", "편의점", "병원/약국", "미용", "학원",
  "마트", "헬스/운동", "반려동물", "세탁",
  "베이커리", "부동산", "스터디카페", "안경원", "꽃집",
  "기타",
];
const CAT_COLOR: Record<StoreCategory, string> = {
  카페: "#F59E0B", 음식점: "#F97316", 편의점: "#3B82F6",
  "병원/약국": "#EF4444", 미용: "#EC4899", 학원: "#8B5CF6",
  마트: "#10B981", "헬스/운동": "#0EA5E9", 반려동물: "#F472B6",
  세탁: "#6366F1",
  베이커리: "#D97706", 부동산: "#0EA5A8", 스터디카페: "#7C3AED",
  안경원: "#0F766E", 꽃집: "#DB2777",
  기타: "#9CA3AF",
};
const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const SELECT = INPUT + " bg-white";
const TEXTAREA = INPUT + " resize-none";

// ─── 업종별 상세 필드 정의 ────────────────────────────────────
type ExtraField = { key: string; label: string; type: "text" | "boolean" | "select"; options?: string[] };
const EXTRA_FIELDS: Partial<Record<StoreCategory, ExtraField[]>> = {
  카페: [
    { key: "menu_highlights", label: "대표 메뉴 (자유 입력)", type: "text" },
    { key: "seats",           label: "좌석 수",               type: "text" },
    { key: "delivery",        label: "배달 가능",             type: "boolean" },
    { key: "wifi",            label: "와이파이",               type: "boolean" },
  ],
  음식점: [
    { key: "menu_highlights", label: "대표 메뉴 (자유 입력)", type: "text" },
    { key: "price_range",     label: "가격대 (예: 1만원대)",  type: "text" },
    { key: "delivery",        label: "배달 가능",             type: "boolean" },
    { key: "reservation",     label: "예약 가능",             type: "boolean" },
  ],
  편의점: [
    { key: "brand",   label: "브랜드",       type: "select",  options: ["GS25", "CU", "세븐일레븐", "이마트24", "기타"] },
    { key: "is_24h",  label: "24시간 운영",  type: "boolean" },
  ],
  "병원/약국": [
    { key: "specialties",      label: "진료과목 / 취급 서비스", type: "text" },
    { key: "reservation_info", label: "예약 방법",               type: "text" },
  ],
  미용: [
    { key: "services",         label: "주요 시술 (쉼표 구분)",  type: "text" },
    { key: "price_range",      label: "가격대",                 type: "text" },
    { key: "reservation_info", label: "예약 방법",              type: "text" },
  ],
  학원: [
    { key: "courses",    label: "강좌명 (쉼표 구분)",     type: "text" },
    { key: "age_range",  label: "대상 연령/학년",         type: "text" },
    { key: "tuition",    label: "수강료",                 type: "text" },
  ],
  "헬스/운동": [
    { key: "programs",        label: "운동 종류 / 프로그램", type: "text" },
    { key: "price_range",     label: "가격대",               type: "text" },
    { key: "trial_available", label: "체험 가능",            type: "boolean" },
  ],
  마트: [
    { key: "fresh_food", label: "신선식품 취급",  type: "boolean" },
    { key: "delivery",   label: "배달 가능",      type: "boolean" },
  ],
  반려동물: [
    { key: "pet_types",    label: "취급 동물 (쉼표 구분)",   type: "text" },
    { key: "service_types",label: "서비스 종류 (쉼표 구분)", type: "text" },
  ],
  세탁: [
    { key: "service_types", label: "서비스 종류", type: "text" },
    { key: "same_day",      label: "당일 처리",   type: "boolean" },
  ],
  베이커리: [
    { key: "menu_highlights", label: "대표 메뉴 (자유 입력)", type: "text" },
    { key: "fresh_baked",     label: "당일 생산",             type: "boolean" },
    { key: "delivery",        label: "배달 가능",             type: "boolean" },
  ],
  부동산: [
    { key: "specialties",     label: "전문 분야 (예: 아파트/오피스텔)", type: "text" },
    { key: "license_no",      label: "공인중개사 등록번호",            type: "text" },
  ],
  스터디카페: [
    { key: "seats",           label: "좌석 수",              type: "text" },
    { key: "is_24h",          label: "24시간 운영",          type: "boolean" },
    { key: "price_range",     label: "이용 요금",            type: "text" },
  ],
  안경원: [
    { key: "brands",          label: "주요 브랜드 (쉼표 구분)", type: "text" },
    { key: "lens_eye_test",   label: "시력검사 가능",         type: "boolean" },
  ],
  꽃집: [
    { key: "specialties",     label: "주요 상품 (꽃다발/화환 등)", type: "text" },
    { key: "delivery",        label: "배달 가능",                  type: "boolean" },
  ],
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── 층 추가 모달 ─────────────────────────────────────────────
function FloorModal({ buildingId, onSave, onClose }: {
  buildingId: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("1F");
  const [level, setLevel] = useState(0);
  const [hasRestroom, setHasRestroom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) { setErr("층 이름을 입력하세요."); return; }
    setSaving(true);
    try {
      await adminCreateFloor({
        building_id: buildingId,
        label: label.trim(),
        level,
        has_restroom: hasRestroom,
        restroom_code: null,
        sort_order: level + 10,
      });
      onSave();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-[15px] font-bold">층 추가</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <Field label="층 레이블 (표시명) *">
            <input className={INPUT} value={label} onChange={e => setLabel(e.target.value)}
              placeholder="B1, 1F, 2F ..." />
          </Field>
          <Field label="층 순서 (level: B1=-1, 1F=0, 2F=1 ...)">
            <input className={INPUT} type="number" value={level}
              onChange={e => setLevel(Number(e.target.value))} />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={hasRestroom} onChange={e => setHasRestroom(e.target.checked)} className="w-4 h-4" />
            <span className="text-[13px] text-[#4E5968]">화장실 있음</span>
          </label>
          {err && <p className="text-[#F04452] text-[12px]">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#4E5968]">취소</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
              {saving ? "저장 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 매장 추가/수정 모달 ──────────────────────────────────────
const STORE_EMPTY: Omit<AdminStore, "id" | "building_id"> = {
  floor_label: "", name: "", category: "기타",
  phone: null, hours: null, is_open: true, is_premium: false,
  x: 0, y: 0, w: 10, h: 10,
  open_date: null, logo_url: null, description: null,
  promo_text: null, emoji: "🏪", show_in_openings: null,
  open_benefit: null, extra_info: null,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold text-[#3182F6] uppercase tracking-widest pt-2 pb-1 border-t border-[#F2F4F6] mt-2">
      {children}
    </p>
  );
}

function StoreModal({ buildingId, floors, initial, onSave, onClose }: {
  buildingId: string;
  floors: AdminFloor[];
  initial: AdminStore | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<AdminStore, "id" | "building_id">>(
    initial
      ? { ...STORE_EMPTY, ...initial }
      : { ...STORE_EMPTY, floor_label: floors[0]?.label ?? "" }
  );
  // open_benefit 상세 항목은 줄바꿈 구분 텍스트로 관리
  const [benefitSummary, setBenefitSummary] = useState(initial?.open_benefit?.summary ?? "");
  const [benefitDetails, setBenefitDetails] = useState((initial?.open_benefit?.details ?? []).join("\n"));
  const [benefitValidUntil, setBenefitValidUntil] = useState(initial?.open_benefit?.validUntil ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }
  function setExtra(key: string, val: unknown) {
    setForm(f => ({ ...f, extra_info: { ...(f.extra_info ?? {}), [key]: val } }));
  }
  function getExtra(key: string): string | boolean {
    const v = (form.extra_info as Record<string, unknown> | null)?.[key];
    return (v as string | boolean) ?? "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("매장명을 입력하세요."); return; }
    if (!form.floor_label) { setErr("층을 선택하세요."); return; }
    setSaving(true);
    const open_benefit = benefitSummary.trim() ? {
      summary: benefitSummary.trim(),
      details: benefitDetails.split("\n").filter(s => s.trim()),
      ...(benefitValidUntil ? { validUntil: benefitValidUntil } : {}),
    } : null;
    try {
      const payload = { ...form, open_benefit, building_id: buildingId };
      if (initial) {
        await adminUpdateStore(initial.id, payload);
      } else {
        await adminCreateStore(payload);
      }
      onSave();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  }

  const extraFields = EXTRA_FIELDS[form.category] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{initial ? "매장 수정" : "매장 추가"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[80vh]">
          <div className="px-6 py-4 space-y-3">

            {/* ── 기본 정보 ── */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="층 *">
                <select className={SELECT} value={form.floor_label}
                  onChange={e => set("floor_label", e.target.value)}>
                  {floors.map(f => <option key={f.id} value={f.label}>{f.label}</option>)}
                </select>
              </Field>
              <Field label="업종 *">
                <select className={SELECT} value={form.category}
                  onChange={e => set("category", e.target.value as StoreCategory)}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="매장명 *">
              <input className={INPUT} value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="예: 파리바게뜨" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="전화번호">
                <input className={INPUT} value={form.phone ?? ""}
                  onChange={e => set("phone", e.target.value || null)} placeholder="032-000-0000" />
              </Field>
              <Field label="영업시간">
                <input className={INPUT} value={form.hours ?? ""}
                  onChange={e => set("hours", e.target.value || null)} placeholder="10:00~22:00" />
              </Field>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_open} onChange={e => set("is_open", e.target.checked)} className="w-4 h-4" />
                <span className="text-[13px] text-[#4E5968]">영업 중</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_premium} onChange={e => set("is_premium", e.target.checked)} className="w-4 h-4" />
                <span className="text-[13px] text-[#4E5968]">프리미엄</span>
              </label>
            </div>

            {/* ── 로고 & 소개 ── */}
            <SectionTitle>로고 · 소개</SectionTitle>
            <Field label="로고 이미지">
              <ImageUpload value={form.logo_url} onChange={url => set("logo_url", url)} folder="stores" />
            </Field>
            <Field label="매장 소개">
              <textarea className={TEXTAREA} rows={2} value={form.description ?? ""}
                onChange={e => set("description", e.target.value || null)}
                placeholder="매장 한 줄 소개" />
            </Field>

            {/* ── 오픈 정보 ── */}
            <SectionTitle>오픈 정보</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="오픈일">
                <input className={INPUT} type="date" value={form.open_date ?? ""}
                  onChange={e => set("open_date", e.target.value || null)} />
              </Field>
              <Field label="이모지">
                <input className={INPUT} value={form.emoji}
                  onChange={e => set("emoji", e.target.value || "🏪")}
                  placeholder="🏪" />
              </Field>
            </div>
            <Field label="홍보 문구 (이번달 오픈 카드에 표시)">
              <input className={INPUT} value={form.promo_text ?? ""}
                onChange={e => set("promo_text", e.target.value || null)}
                placeholder="예: 오픈 기념 전 메뉴 10% 할인" />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                checked={form.show_in_openings === true}
                onChange={e => set("show_in_openings", e.target.checked ? true : null)}
                className="w-4 h-4" />
              <span className="text-[13px] text-[#4E5968]">이번달 오픈 섹션에 항상 노출 (수동 고정)</span>
            </label>

            {/* ── 오픈 혜택 ── */}
            <details className="border border-[#E5E8EB] rounded-xl overflow-hidden">
              <summary className="px-3 py-2.5 text-[12px] font-semibold text-[#8B95A1] cursor-pointer hover:bg-[#F8F9FB]">
                오픈 혜택 상세 (선택사항)
              </summary>
              <div className="px-3 py-3 space-y-3">
                <Field label="혜택 요약 (카드에 표시)">
                  <input className={INPUT} value={benefitSummary}
                    onChange={e => setBenefitSummary(e.target.value)}
                    placeholder="예: 당일 모든메뉴 50%" />
                </Field>
                <Field label="혜택 상세 (한 줄에 하나씩)">
                  <textarea className={TEXTAREA} rows={3} value={benefitDetails}
                    onChange={e => setBenefitDetails(e.target.value)}
                    placeholder={"당일 모든메뉴 50% 할인\n리유저블 컵 증정\n사이즈업 무료"} />
                </Field>
                <Field label="혜택 종료일">
                  <input className={INPUT} type="date" value={benefitValidUntil}
                    onChange={e => setBenefitValidUntil(e.target.value)} />
                </Field>
              </div>
            </details>

            {/* ── 업종별 상세 ── */}
            {extraFields.length > 0 && (
              <>
                <SectionTitle>업종별 상세 정보</SectionTitle>
                {extraFields.map(f => (
                  <Field key={f.key} label={f.label}>
                    {f.type === "boolean" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={getExtra(f.key) === true}
                          onChange={e => setExtra(f.key, e.target.checked)}
                          className="w-4 h-4" />
                        <span className="text-[13px] text-[#4E5968]">예</span>
                      </label>
                    ) : f.type === "select" ? (
                      <select className={SELECT} value={(getExtra(f.key) as string) || ""}
                        onChange={e => setExtra(f.key, e.target.value)}>
                        <option value="">선택</option>
                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className={INPUT} value={(getExtra(f.key) as string) || ""}
                        onChange={e => setExtra(f.key, e.target.value || "")} />
                    )}
                  </Field>
                ))}
              </>
            )}

            {/* ── SVG 맵 좌표 ── */}
            <details className="border border-[#E5E8EB] rounded-xl overflow-hidden">
              <summary className="px-3 py-2.5 text-[12px] font-semibold text-[#8B95A1] cursor-pointer hover:bg-[#F8F9FB]">
                SVG 맵 좌표 (선택사항)
              </summary>
              <div className="px-3 py-3 grid grid-cols-4 gap-2">
                {(["x", "y", "w", "h"] as const).map(k => (
                  <Field key={k} label={k.toUpperCase()}>
                    <input className={INPUT} type="number" value={form[k]}
                      onChange={e => set(k, Number(e.target.value))} />
                  </Field>
                ))}
              </div>
            </details>

            {err && <p className="text-[#F04452] text-[12px]">{err}</p>}
          </div>
          <div className="px-6 py-4 border-t flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] border border-[#E5E8EB] text-[#4E5968]">취소</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-[13px] font-bold bg-[#3182F6] text-white disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 인라인 영업중 토글 ───────────────────────────────────────
function OpenToggle({ store, onToggled }: { store: AdminStore; onToggled: () => void }) {
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    try { await adminUpdateStore(store.id, { is_open: !store.is_open }); onToggled(); }
    finally { setLoading(false); }
  }
  return (
    <button onClick={toggle} disabled={loading}
      className={`w-8 h-5 rounded-full transition-colors ${store.is_open ? "bg-[#00C471]" : "bg-[#E5E8EB]"} disabled:opacity-50`}>
      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${store.is_open ? "translate-x-3" : "translate-x-0"}`} />
    </button>
  );
}

// ─── 건물 기본정보 탭 ─────────────────────────────────────────
function BuildingInfoTab({ building, onSaved }: { building: AdminBuilding; onSaved: () => void }) {
  const [form, setForm] = useState({ ...building });
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  function set<K extends keyof AdminBuilding>(k: K, v: AdminBuilding[K]) {
    setForm(f => ({ ...f, [k]: v })); setOk(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpdateBuilding(building.id, form);
      setOk(true);
      onSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-4 max-w-full">
      <Field label="건물명 *">
        <input className={INPUT} value={form.name} onChange={e => set("name", e.target.value)} />
      </Field>
      <Field label="주소">
        <input className={INPUT} value={form.address ?? ""} onChange={e => set("address", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="위도(lat)">
          <input className={INPUT} type="number" step="0.000001"
            value={form.lat ?? ""} onChange={e => set("lat", e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="경도(lng)">
          <input className={INPUT} type="number" step="0.000001"
            value={form.lng ?? ""} onChange={e => set("lng", e.target.value ? Number(e.target.value) : null)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="층 수">
          <input className={INPUT} type="number" value={form.floors ?? ""}
            onChange={e => set("floors", e.target.value ? Number(e.target.value) : null)} />
        </Field>
        <Field label="총 매장수">
          <input className={INPUT} type="number" value={form.total_stores ?? ""}
            onChange={e => set("total_stores", e.target.value ? Number(e.target.value) : null)} />
        </Field>
      </div>
      <Field label="주차 안내">
        <input className={INPUT} value={form.parking_info ?? ""}
          onChange={e => set("parking_info", e.target.value || null)} />
      </Field>
      <Field label="영업시간">
        <input className={INPUT} value={form.open_time ?? ""}
          onChange={e => set("open_time", e.target.value || null)} />
      </Field>
      <Field label="이미지">
        <ImageUpload
          value={form.image_url}
          onChange={url => set("image_url", url)}
          folder="buildings"
        />
      </Field>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.has_data} onChange={e => set("has_data", e.target.checked)} className="w-4 h-4" />
        <span className="text-[13px] text-[#4E5968]">상세 데이터 있음 (has_data)</span>
      </label>
      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold disabled:opacity-50 hover:bg-[#2563EB]">
        {saving ? <RefreshCw size={14} className="animate-spin" /> : ok ? <Check size={14} /> : null}
        {saving ? "저장 중..." : ok ? "저장됨" : "저장"}
      </button>
    </form>
  );
}

// ─── 층/매장 탭 ───────────────────────────────────────────────
function FloorsTab({ building }: { building: AdminBuilding }) {
  const [floors, setFloors] = useState<AdminFloor[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [selFloor, setSelFloor] = useState<string | null>(null);
  const [floorModal, setFloorModal] = useState(false);
  const [storeModal, setStoreModal] = useState<"add" | AdminStore | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [f, s] = await Promise.all([
      adminFetchFloors(building.id),
      adminFetchStores(building.id),
    ]);
    setFloors(f);
    setStores(s);
    if (!selFloor && f.length > 0) setSelFloor(f[0].label);
    setLoading(false);
  }, [building.id, selFloor]);

  useEffect(() => { loadData(); }, [building.id]); // eslint-disable-line

  async function deleteFloor(floor: AdminFloor) {
    if (!confirm(`'${floor.label}' 층을 삭제할까요? 해당 층 매장도 함께 삭제됩니다.`)) return;
    await adminDeleteFloor(floor.id);
    setSelFloor(null);
    loadData();
  }

  async function deleteStore(store: AdminStore) {
    if (!confirm(`'${store.name}'을 삭제할까요?`)) return;
    await adminDeleteStore(store.id);
    loadData();
  }

  const floorStores = stores.filter(s => s.floor_label === selFloor);

  return (
    <div>
      {/* 층 탭 바 - 모바일에서 가로 스크롤 */}
      <div className="overflow-x-auto mb-4">
        <div className="flex items-center gap-2 whitespace-nowrap pb-1">
          {floors.map(f => (
            <div key={f.id} className="flex items-center shrink-0">
              <button
                onClick={() => setSelFloor(f.label)}
                className={`px-3 py-1.5 rounded-l-xl text-[13px] font-semibold transition-all border ${
                  selFloor === f.label
                    ? "bg-[#3182F6] text-white border-[#3182F6]"
                    : "bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#3182F6]"
                }`}>
                {f.label}
                <span className="ml-1 text-[11px] opacity-70">
                  ({stores.filter(s => s.floor_label === f.label).length})
                </span>
              </button>
              <button
                onClick={() => deleteFloor(f)}
                className="px-1.5 py-1.5 rounded-r-xl border border-l-0 border-[#E5E8EB] text-[#F04452] hover:bg-[#FFF0F0]">
                <X size={12} />
              </button>
            </div>
          ))}
          <button onClick={() => setFloorModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-[#B0B8C1] rounded-xl text-[13px] text-[#8B95A1] hover:border-[#3182F6] hover:text-[#3182F6] shrink-0">
            <Plus size={13} /> 층 추가
          </button>
        </div>
      </div>

      {/* 선택된 층의 매장 목록 */}
      {selFloor && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F6]">
            <span className="text-[14px] font-bold text-[#191F28]">
              {selFloor} 매장 <span className="text-[#B0B8C1] font-normal">({floorStores.length}개)</span>
            </span>
            <button onClick={() => setStoreModal("add")}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#3182F6] text-white rounded-xl text-[12px] font-bold hover:bg-[#2563EB]">
              <Plus size={13} /> 매장 추가
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
          ) : floorStores.length === 0 ? (
            <div className="py-8 text-center text-[#B0B8C1] text-[13px]">매장 없음</div>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <table className="hidden md:table w-full text-[13px]">
                <thead className="bg-[#F8F9FB]">
                  <tr>
                    {["매장명", "업종", "전화", "영업시간", "영업중", "프리미엄", "수정/삭제"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-bold text-[#8B95A1]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F6]">
                  {floorStores.map(s => (
                    <tr key={s.id} className="hover:bg-[#F8F9FB]">
                      <td className="px-4 py-3 font-semibold text-[#191F28]">
                        {s.name}
                        {s.is_premium && <span className="ml-1.5 text-[10px] bg-[#FEF3C7] text-[#B45309] px-1.5 py-0.5 rounded-full font-bold">★</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: CAT_COLOR[s.category] }}>
                          {s.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#4E5968]">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-[#4E5968]">{s.hours ?? "—"}</td>
                      <td className="px-4 py-3">
                        <OpenToggle store={s} onToggled={loadData} />
                      </td>
                      <td className="px-4 py-3">
                        {s.is_premium
                          ? <Check size={14} className="text-[#F59E0B]" />
                          : <span className="text-[#E5E8EB]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setStoreModal(s)}
                            className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteStore(s)}
                            className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 모바일 카드 목록 */}
              <div className="md:hidden divide-y divide-[#F2F4F6]">
                {floorStores.map(s => (
                  <div key={s.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <p className="font-bold text-[14px] text-[#191F28]">{s.name}</p>
                          {s.is_premium && (
                            <span className="text-[10px] bg-[#FEF3C7] text-[#B45309] px-1.5 py-0.5 rounded-full font-bold">★ 프리미엄</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: CAT_COLOR[s.category] }}>
                            {s.category}
                          </span>
                          {s.phone && <span className="text-[12px] text-[#4E5968]">{s.phone}</span>}
                          {s.hours && <span className="text-[12px] text-[#8B95A1]">{s.hours}</span>}
                        </div>
                      </div>
                      <OpenToggle store={s} onToggled={loadData} />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setStoreModal(s)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#3182F6] hover:bg-[#EFF6FF]">
                        <Pencil size={13} /> 수정
                      </button>
                      <button onClick={() => deleteStore(s)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#F04452] hover:bg-[#FFF0F0]">
                        <Trash2 size={13} /> 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {floorModal && (
        <FloorModal buildingId={building.id} onSave={loadData} onClose={() => setFloorModal(false)} />
      )}
      {storeModal && (
        <StoreModal
          buildingId={building.id}
          floors={floors}
          initial={storeModal === "add" ? null : storeModal as AdminStore}
          onSave={loadData}
          onClose={() => setStoreModal(null)}
        />
      )}
    </div>
  );
}

// ─── 메인 (Suspense 래핑 필요) ────────────────────────────────
function DetailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const [building, setBuilding] = useState<AdminBuilding | null>(null);
  const [tab, setTab] = useState<"info" | "floors">("floors");
  const [loading, setLoading] = useState(true);

  const loadBuilding = useCallback(async () => {
    if (!id) return;
    const all = await adminFetchBuildings();
    setBuilding(all.find(b => b.id === id) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadBuilding(); }, [loadBuilding]);

  if (loading) {
    return <div className="p-8 text-center text-[#B0B8C1]">로딩 중...</div>;
  }
  if (!building) {
    return <div className="p-8 text-center text-[#F04452]">건물을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push("/admin/stores")}
          className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
          <ChevronLeft size={16} className="text-[#4E5968]" />
        </button>
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">{building.name}</h1>
          <p className="text-[12px] text-[#8B95A1]">ID: {building.id} · {building.address}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 bg-[#F2F4F6] rounded-xl p-1 w-fit">
        {(["floors", "info"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t ? "bg-white shadow-sm text-[#191F28]" : "text-[#8B95A1] hover:text-[#191F28]"
            }`}>
            {t === "floors" ? "층 · 매장 관리" : "건물 기본정보"}
          </button>
        ))}
      </div>

      {tab === "info" && <BuildingInfoTab building={building} onSaved={loadBuilding} />}
      {tab === "floors" && <FloorsTab building={building} />}
    </div>
  );
}

export default function AdminStoreDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#B0B8C1]">로딩 중...</div>}>
      <DetailContent />
    </Suspense>
  );
}
