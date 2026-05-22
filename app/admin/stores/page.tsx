"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ChevronRight, Search, RefreshCw, Tag, ChevronDown } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchBuildings,
  adminCreateBuilding,
  adminUpdateBuilding,
  adminDeleteBuilding,
  adminFetchCoupons,
  adminUpsertCoupon,
  adminDeleteCoupon,
  type AdminBuilding,
  type AdminCoupon,
} from "@/lib/db/admin-stores";
import type { StoreCategory } from "@/lib/types";

// ─── 공통 Field 래퍼 ──────────────────────────────────────────
const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const SELECT = INPUT + " bg-white";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── 건물 추가/수정 폼 ────────────────────────────────────────
const EMPTY: Omit<AdminBuilding, "id"> = {
  name: "", address: "", lat: null, lng: null,
  floors: null, total_stores: null,
  parking_info: null, open_time: null,
  has_data: true, categories: null, image_url: null,
};

function BuildingModal({
  initial, onSave, onClose,
}: {
  initial: AdminBuilding | null;
  onSave: (data: Omit<AdminBuilding, "id">) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<AdminBuilding, "id">>(
    initial ? { ...initial } : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("건물명을 입력하세요."); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#191F28]">
            {initial ? "건물 수정" : "건물 추가"}
          </h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28] text-xl">✕</button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto max-h-[70vh]">
          <div className="px-6 py-4 space-y-3">
            <Field label="건물명 *">
              <input className={INPUT} value={form.name}
                onChange={e => set("name", e.target.value)} placeholder="예: JK타워" />
            </Field>
            <Field label="주소">
              <input className={INPUT} value={form.address ?? ""}
                onChange={e => set("address", e.target.value)} placeholder="인천 서구 당하동 ..." />
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
                <input className={INPUT} type="number" min="1"
                  value={form.floors ?? ""} onChange={e => set("floors", e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="총 매장수">
                <input className={INPUT} type="number" min="0"
                  value={form.total_stores ?? ""} onChange={e => set("total_stores", e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
            <Field label="주차 안내">
              <input className={INPUT} value={form.parking_info ?? ""}
                onChange={e => set("parking_info", e.target.value || null)} placeholder="예: 지하 2층, 3시간 무료" />
            </Field>
            <Field label="영업시간">
              <input className={INPUT} value={form.open_time ?? ""}
                onChange={e => set("open_time", e.target.value || null)} placeholder="예: 매일 10:00~22:00" />
            </Field>
            <Field label="이미지">
              <ImageUpload
                value={form.image_url}
                onChange={url => set("image_url", url)}
                folder="buildings"
              />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.has_data}
                onChange={e => set("has_data", e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-[13px] text-[#4E5968]">상세 데이터 있음 (has_data)</span>
            </label>
            {err && <p className="text-[#F04452] text-[12px]">{err}</p>}
          </div>

          <div className="px-6 py-4 border-t flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]">
              취소
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-[13px] font-bold bg-[#3182F6] text-white hover:bg-[#2563EB] disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 쿠폰 폼 모달 ─────────────────────────────────────────────
const CATS: StoreCategory[] = ["카페", "음식점", "편의점", "병원/약국", "미용", "학원", "마트", "기타"];

function newCouponId() { return "cp_" + Date.now().toString(36); }

const EMPTY_COUPON: AdminCoupon = {
  id: "", store_id: "", store_name: "", building_name: "",
  title: "", discount: "", discount_type: "rate",
  category: "기타", expiry: "", color: "#3182F6", active: true,
};

function CouponFormModal({ initial, buildingName, onSave, onClose }: {
  initial: AdminCoupon | null;
  buildingName: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdminCoupon>(
    initial ?? { ...EMPTY_COUPON, id: newCouponId(), building_name: buildingName }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof AdminCoupon>(k: K, v: AdminCoupon[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.store_name.trim()) { setErr("매장명을 입력하세요."); return; }
    if (!form.title.trim()) { setErr("쿠폰 제목을 입력하세요."); return; }
    if (!form.expiry) { setErr("만료일을 입력하세요."); return; }
    setSaving(true);
    try {
      await adminUpsertCoupon(form);
      onSave();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{initial ? "쿠폰 수정" : `쿠폰 추가 — ${buildingName}`}</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[75vh]">
          <div className="px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="매장명 *">
                <input className={INPUT} value={form.store_name}
                  onChange={e => set("store_name", e.target.value)} placeholder="파리바게뜨" />
              </Field>
              <Field label="건물명">
                <input className={INPUT} value={form.building_name}
                  onChange={e => set("building_name", e.target.value)} />
              </Field>
            </div>
            <Field label="매장 ID (stores.id)">
              <input className={INPUT} value={form.store_id}
                onChange={e => set("store_id", e.target.value)} placeholder="s_jk_1f_1 (선택)" />
            </Field>
            <Field label="업종">
              <select className={SELECT} value={form.category}
                onChange={e => set("category", e.target.value as StoreCategory)}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="쿠폰 제목 *">
              <input className={INPUT} value={form.title}
                onChange={e => set("title", e.target.value)} placeholder="아메리카노 15% 할인" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="할인 값 *">
                <input className={INPUT} value={form.discount}
                  onChange={e => set("discount", e.target.value)} placeholder="15% 또는 1,000원" />
              </Field>
              <Field label="할인 타입">
                <select className={SELECT} value={form.discount_type}
                  onChange={e => set("discount_type", e.target.value as "rate" | "amount")}>
                  <option value="rate">율 (rate) — %</option>
                  <option value="amount">금액 (amount) — 원</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="만료일 *">
                <input className={INPUT} type="date" value={form.expiry}
                  onChange={e => set("expiry", e.target.value)} />
              </Field>
              <Field label="브랜드 색상">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color}
                    onChange={e => set("color", e.target.value)}
                    className="w-10 h-9 rounded-xl border border-[#E5E8EB] cursor-pointer p-1" />
                  <input className={INPUT} value={form.color}
                    onChange={e => set("color", e.target.value)} placeholder="#3182F6" />
                </div>
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} className="w-4 h-4" />
              <span className="text-[13px] text-[#4E5968]">활성 상태 (active)</span>
            </label>
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

// ─── 인라인 쿠폰 패널 ─────────────────────────────────────────
function CouponPanel({ building }: { building: AdminBuilding }) {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponModal, setCouponModal] = useState<"add" | AdminCoupon | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const all = await adminFetchCoupons();
      setCoupons(all.filter(c => c.building_name === building.name));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [building.name]);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  async function handleDeleteCoupon(id: string, name: string) {
    if (!confirm(`'${name}' 쿠폰을 삭제할까요?`)) return;
    await adminDeleteCoupon(id);
    loadCoupons();
  }

  return (
    <div className="mt-3 border border-[#E5E8EB] rounded-2xl bg-[#FAFBFC] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E8EB] bg-white">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-[#F59E0B]" />
          <span className="text-[13px] font-bold text-[#191F28]">쿠폰 목록</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">{coupons.length}개</span>
        </div>
        <button
          onClick={() => setCouponModal("add")}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#3182F6] text-white rounded-xl text-[12px] font-bold hover:bg-[#2563EB]"
        >
          <Plus size={12} /> 쿠폰 추가
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-[12px] text-[#B0B8C1]">로딩 중...</div>
      ) : coupons.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-[#B0B8C1]">등록된 쿠폰이 없습니다</div>
      ) : (
        <div className="divide-y divide-[#F2F4F6]">
          {coupons.map(c => {
            const expired = c.expiry < today;
            const urgent = !expired && c.expiry <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
            return (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${expired ? "opacity-50" : ""}`}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-[#191F28] truncate">{c.store_name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">{c.category}</span>
                  </div>
                  <p className="text-[12px] text-[#4E5968] truncate mt-0.5">{c.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] font-bold" style={{ color: c.color }}>{c.discount}</span>
                    <span className={`text-[11px] font-semibold ${expired ? "text-[#9CA3AF]" : urgent ? "text-[#F04452]" : "text-[#4E5968]"}`}>
                      {expired ? "⚠ 만료" : urgent ? `⏰ D-${Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000)}` : `~${c.expiry}`}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.active ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {c.active ? "활성" : "비활성"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setCouponModal(c)}
                    className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDeleteCoupon(c.id, c.store_name)}
                    className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {couponModal && (
        <CouponFormModal
          initial={couponModal === "add" ? null : couponModal as AdminCoupon}
          buildingName={building.name}
          onSave={loadCoupons}
          onClose={() => setCouponModal(null)}
        />
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export default function AdminStoresPage() {
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | AdminBuilding | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedCoupons, setExpandedCoupons] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try { setBuildings(await adminFetchBuildings()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = buildings.filter(b =>
    b.name.includes(search) || (b.address ?? "").includes(search)
  );

  async function handleSave(data: Omit<AdminBuilding, "id">) {
    if (typeof modal === "object" && modal !== null && modal !== undefined && "id" in modal) {
      await adminUpdateBuilding((modal as AdminBuilding).id, data);
    } else {
      await adminCreateBuilding(data);
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 건물을 삭제할까요? 연결된 층·매장도 함께 삭제됩니다.")) return;
    setDeleting(id);
    try { await adminDeleteBuilding(id); await load(); }
    catch (e) { alert((e as Error).message); }
    finally { setDeleting(null); }
  }

  function toggleCoupons(id: string) {
    setExpandedCoupons(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">상가건물 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">DB: buildings 테이블 · {buildings.length}개 건물</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold hover:bg-[#2563EB]">
            <Plus size={15} /> 건물 추가
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0B8C1]" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]"
          placeholder="건물명 또는 주소 검색..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden md:block">
        <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
              <tr>
                {["건물명", "주소", "층수", "매장수", "데이터", "쿠폰 관리", "층·매장 관리", "수정/삭제"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F6]">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">건물 없음</td></tr>
              ) : filtered.map(b => (
                <>
                  <tr key={b.id} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#191F28]">{b.name}</td>
                    <td className="px-4 py-3 text-[#4E5968] max-w-[200px] truncate">{b.address ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-[#4E5968]">{b.floors ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-[#4E5968]">{b.total_stores ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        b.has_data ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"
                      }`}>{b.has_data ? "있음" : "없음"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleCoupons(b.id)}
                        className={`flex items-center gap-1 text-[13px] font-semibold transition-colors ${
                          expandedCoupons.has(b.id) ? "text-[#F59E0B]" : "text-[#8B95A1] hover:text-[#F59E0B]"
                        }`}
                      >
                        <Tag size={13} />
                        쿠폰
                        <ChevronDown size={12} className={`transition-transform ${expandedCoupons.has(b.id) ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/stores/detail?id=${b.id}`}
                        className="inline-flex items-center gap-1 text-[#3182F6] font-semibold hover:underline">
                        관리 <ChevronRight size={13} />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setModal(b)}
                          className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          disabled={deleting === b.id}
                          className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452] disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedCoupons.has(b.id) && (
                    <tr key={`${b.id}-coupons`}>
                      <td colSpan={8} className="px-4 pb-4 bg-[#FAFBFC]">
                        <CouponPanel building={b} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 카드 목록 */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">건물 없음</div>
        ) : filtered.map(b => (
          <div key={b.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-[14px] text-[#191F28] truncate">{b.name}</p>
                <p className="text-[12px] text-[#8B95A1] truncate mt-0.5">{b.address ?? "주소 없음"}</p>
              </div>
              <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                b.has_data ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"
              }`}>{b.has_data ? "있음" : "없음"}</span>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[#4E5968] mb-3">
              <span>{b.floors ?? "—"}층</span>
              <span className="text-[#E5E8EB]">|</span>
              <span>{b.total_stores ?? "—"}개 매장</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/admin/stores/detail?id=${b.id}`}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#EFF6FF] text-[#3182F6] rounded-xl text-[13px] font-semibold">
                층·매장 관리 <ChevronRight size={13} />
              </Link>
              <button onClick={() => setModal(b)}
                className="p-2 rounded-xl border border-[#E5E8EB] text-[#3182F6] hover:bg-[#EFF6FF]">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(b.id)}
                disabled={deleting === b.id}
                className="p-2 rounded-xl border border-[#E5E8EB] text-[#F04452] hover:bg-[#FFF0F0] disabled:opacity-40">
                <Trash2 size={15} />
              </button>
            </div>
            <button
              onClick={() => toggleCoupons(b.id)}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                expandedCoupons.has(b.id)
                  ? "bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]"
                  : "border-[#E5E8EB] text-[#8B95A1] hover:bg-[#FEF3C7] hover:border-[#F59E0B] hover:text-[#92400E]"
              }`}
            >
              <Tag size={13} />
              쿠폰 관리
              <ChevronDown size={12} className={`transition-transform ${expandedCoupons.has(b.id) ? "rotate-180" : ""}`} />
            </button>
            {expandedCoupons.has(b.id) && (
              <CouponPanel building={b} />
            )}
          </div>
        ))}
      </div>

      {/* 모달 */}
      {modal && (
        <BuildingModal
          initial={modal === "add" ? null : modal as AdminBuilding}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
