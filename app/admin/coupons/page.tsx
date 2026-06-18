"use client";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, RefreshCw, Minus } from "lucide-react";
import {
  adminFetchCoupons, adminUpsertCoupon, adminDeleteCoupon,
  type AdminCoupon,
} from "@/lib/db/admin-stores";
import type { StoreCategory } from "@/lib/types";

const CATS: StoreCategory[] = [
  "카페", "음식점", "편의점", "병원/약국", "미용", "학원", "마트",
  "베이커리", "부동산", "스터디카페", "안경원", "꽃집",
  "기타",
];
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

function newId() { return "cp_" + Date.now().toString(36); }
const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_COUPON: AdminCoupon = {
  id: "", store_id: "", store_name: "", building_name: "",
  title: "", discount: "", discount_type: "rate",
  category: "기타", start_date: null, issued_date: today(), expiry: "",
  quantity: null, used_count: 0, view_count: 0, download_count: 0,
  conditions: null, max_per_user: null,
  color: "#3182F6", active: true,
  required_points: null, stock: null,
};

function remaining(c: AdminCoupon): number | null {
  return c.quantity == null ? null : Math.max(0, c.quantity - (c.used_count ?? 0));
}

function CouponModal({ initial, prefill, onSave, onClose }: {
  initial: AdminCoupon | null;
  prefill?: Partial<AdminCoupon>;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdminCoupon>(
    initial ?? { ...EMPTY_COUPON, ...prefill, id: newId() }
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
    if (form.required_points != null && form.required_points < 1) {
      setErr("교환 필요 포인트는 1 이상이어야 합니다."); return;
    }
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
          <h2 className="text-[15px] font-bold">{initial ? "쿠폰 수정" : "쿠폰 발행"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[75vh]">
          <div className="px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="매장명 *">
                <input className={INPUT} value={form.store_name}
                  onChange={e => set("store_name", e.target.value)} placeholder="파리바게뜨" />
              </Field>
              <Field label="건물명 *">
                <input className={INPUT} value={form.building_name}
                  onChange={e => set("building_name", e.target.value)} placeholder="JK타워" />
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
              <Field label="발행일">
                <input className={INPUT} type="date" value={form.issued_date ?? ""}
                  onChange={e => set("issued_date", e.target.value || null)} />
              </Field>
              <Field label="만료일 *">
                <input className={INPUT} type="date" value={form.expiry}
                  onChange={e => set("expiry", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="발행 수량 (비우면 무제한)">
                <input className={INPUT} type="number" min="0" value={form.quantity ?? ""}
                  onChange={e => set("quantity", e.target.value ? Number(e.target.value) : null)}
                  placeholder="무제한" />
              </Field>
              <Field label="사용 횟수">
                <input className={INPUT} type="number" min="0" value={form.used_count}
                  onChange={e => set("used_count", Math.max(0, Number(e.target.value) || 0))} />
              </Field>
            </div>
            {form.quantity != null && (
              <p className="text-[12px] text-[#4E5968]">
                잔여수량: <b className="text-[#3182F6]">{Math.max(0, form.quantity - form.used_count)}</b> / {form.quantity}
              </p>
            )}
            <div className="rounded-xl bg-[#F8F9FB] border border-[#E5E8EB] p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={form.required_points != null}
                  onChange={e => set("required_points", e.target.checked ? 100 : null)}
                  className="w-4 h-4" />
                <span className="text-[13px] font-semibold text-[#191F28]">포인트 교환형 쿠폰</span>
              </label>
              <p className="text-[11px] text-[#8B95A1] -mt-1">
                체크 시 마이페이지 ‘포인트 교환’에 노출됩니다. (해제 = 일반 매장 쿠폰)
              </p>
              {form.required_points != null && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="교환 필요 포인트 *">
                    <input className={INPUT} type="number" min={1} value={form.required_points}
                      onChange={e => set("required_points", Math.max(0, Number(e.target.value)))}
                      placeholder="800" />
                  </Field>
                  <Field label="수량 제한 (비우면 무제한)">
                    <input className={INPUT} type="number" min={0}
                      value={form.stock ?? ""}
                      onChange={e => set("stock", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                      placeholder="무제한" />
                  </Field>
                </div>
              )}
            </div>
            <Field label="브랜드 색상">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color}
                  onChange={e => set("color", e.target.value)}
                  className="w-10 h-9 rounded-xl border border-[#E5E8EB] cursor-pointer p-1" />
                <input className={INPUT} value={form.color}
                  onChange={e => set("color", e.target.value)} placeholder="#3182F6" />
              </div>
            </Field>
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

function CouponsContent() {
  const params = useSearchParams();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | AdminCoupon | null>(null);
  const [filterStore, setFilterStore] = useState("");

  // /admin/coupons?store=ID&name=매장명&building=건물명 → 발행 모달 프리필
  const prefill: Partial<AdminCoupon> | undefined = params.get("name")
    ? {
        store_id: params.get("store") ?? "",
        store_name: params.get("name") ?? "",
        building_name: params.get("building") ?? "",
        category: (params.get("cat") as StoreCategory) || "기타",
      }
    : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try { setCoupons(await adminFetchCoupons()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (params.get("name")) { setFilterStore(params.get("name") ?? ""); setModal("add"); }
  }, [params]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}' 쿠폰을 삭제할까요?`)) return;
    await adminDeleteCoupon(id);
    load();
  }

  async function bumpUsed(c: AdminCoupon, delta: number) {
    const next = Math.max(0, (c.used_count ?? 0) + delta);
    await adminUpsertCoupon({ ...c, used_count: next });
    load();
  }

  const t = today();
  const filtered = filterStore
    ? coupons.filter(c => c.store_name.includes(filterStore) || c.building_name.includes(filterStore))
    : coupons;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">쿠폰 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">
            매장별 쿠폰 발행 · 수량 · 사용현황 · 전체 {coupons.length}개 · 포인트 교환형 {coupons.filter(c => c.required_points != null).length}개
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold hover:bg-[#2563EB]">
            <Plus size={15} /> 쿠폰 발행
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          className="w-full md:max-w-xs border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]"
          placeholder="매장명 / 건물명으로 필터..."
          value={filterStore} onChange={e => setFilterStore(e.target.value)}
        />
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
            <tr>
              {["매장명", "건물", "쿠폰 제목", "할인", "발행일", "만료일", "사용현황", "상태", "관리"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#B0B8C1]">쿠폰 없음</td></tr>
            ) : filtered.map(c => {
              const expired = c.expiry < t;
              const rem = remaining(c);
              const soldOut = rem === 0;
              return (
                <tr key={c.id} className={`hover:bg-[#F8F9FB] ${expired || soldOut ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="font-semibold text-[#191F28]">{c.store_name}</span>
                      {c.required_points != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6]">
                          {c.required_points}P 교환{c.stock != null ? ` · ${c.stock}개` : ""}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4E5968]">{c.building_name}</td>
                  <td className="px-4 py-3 text-[#4E5968] max-w-[160px] truncate">{c.title}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: c.color }}>{c.discount}</td>
                  <td className="px-4 py-3 text-[#8B95A1] text-[12px]">{c.issued_date ?? "—"}</td>
                  <td className={`px-4 py-3 font-semibold ${expired ? "text-[#9CA3AF]" : "text-[#4E5968]"}`}>
                    {expired ? "⚠ 만료" : c.expiry}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#4E5968]">
                        사용 <b>{c.used_count}</b>
                        {c.quantity != null && <> / {c.quantity} · 잔여 <b className={soldOut ? "text-[#F04452]" : "text-[#3182F6]"}>{rem}</b></>}
                        {c.quantity == null && <span className="text-[#B0B8C1]"> · 무제한</span>}
                      </span>
                      <div className="flex">
                        <button onClick={() => bumpUsed(c, -1)} className="p-1 rounded-l-md border border-[#E5E8EB] text-[#8B95A1] hover:bg-[#F2F4F6]"><Minus size={11} /></button>
                        <button onClick={() => bumpUsed(c, 1)} className="p-1 rounded-r-md border border-l-0 border-[#E5E8EB] text-[#3182F6] hover:bg-[#EFF6FF]"><Plus size={11} /></button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.active && !soldOut ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {soldOut ? "소진" : c.active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setModal(c)} className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(c.id, c.store_name)} className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 목록 */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">쿠폰 없음</div>
        ) : filtered.map(c => {
          const expired = c.expiry < t;
          const rem = remaining(c);
          const soldOut = rem === 0;
          return (
            <div key={c.id} className={`bg-white rounded-2xl border border-[#E5E8EB] p-4 ${expired || soldOut ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-[#191F28] truncate">{c.store_name}</p>
                    <p className="text-[12px] text-[#8B95A1] truncate">{c.building_name}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${c.active && !soldOut ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                  {soldOut ? "소진" : c.active ? "활성" : "비활성"}
                </span>
              </div>
              <p className="text-[13px] text-[#4E5968] mb-2 truncate">{c.title}</p>
              {c.required_points != null && (
                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] mb-2">
                  {c.required_points}P 교환{c.stock != null ? ` · 잔여 ${c.stock}개` : " · 무제한"}
                </span>
              )}
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">{c.category}</span>
                <span className="font-bold text-[13px]" style={{ color: c.color }}>{c.discount}</span>
                <span className={`text-[12px] font-semibold ${expired ? "text-[#9CA3AF]" : "text-[#4E5968]"}`}>
                  {expired ? "⚠ 만료" : `~${c.expiry.slice(5)}`}
                </span>
                <span className="text-[12px] text-[#4E5968]">
                  사용 {c.used_count}{c.quantity != null ? ` / ${c.quantity} · 잔여 ${rem}` : " · 무제한"}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => bumpUsed(c, 1)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#3182F6] hover:bg-[#EFF6FF]">
                  <Plus size={13} /> 사용 +1
                </button>
                <button onClick={() => setModal(c)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#3182F6]">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(c.id, c.store_name)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#F04452]">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <CouponModal
          initial={modal === "add" ? null : modal as AdminCoupon}
          prefill={modal === "add" ? prefill : undefined}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function AdminCouponsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#B0B8C1]">로딩 중...</div>}>
      <CouponsContent />
    </Suspense>
  );
}
