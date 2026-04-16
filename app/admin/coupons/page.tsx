"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  adminFetchCoupons, adminUpsertCoupon, adminDeleteCoupon,
  type AdminCoupon,
} from "@/lib/db/admin-stores";
import type { StoreCategory } from "@/lib/types";

const CATS: StoreCategory[] = ["카페", "음식점", "편의점", "병원/약국", "미용", "학원", "마트", "기타"];
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

const EMPTY_COUPON: AdminCoupon = {
  id: "", store_id: "", store_name: "", building_name: "",
  title: "", discount: "", discount_type: "rate",
  category: "기타", expiry: "", color: "#3182F6", active: true,
};

function CouponModal({ initial, onSave, onClose }: {
  initial: AdminCoupon | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdminCoupon>(
    initial ?? { ...EMPTY_COUPON, id: newId() }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{initial ? "쿠폰 수정" : "쿠폰 추가"}</h2>
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

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | AdminCoupon | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCoupons(await adminFetchCoupons()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}' 쿠폰을 삭제할까요?`)) return;
    await adminDeleteCoupon(id);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#191F28]">쿠폰 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">DB: store_coupons 테이블 · {coupons.length}개</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold hover:bg-[#2563EB]">
            <Plus size={15} /> 쿠폰 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
            <tr>
              {["매장명", "건물", "업종", "쿠폰 제목", "할인", "만료일", "상태", "수정/삭제"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">쿠폰 없음</td></tr>
            ) : coupons.map(c => {
              const expired = c.expiry < today;
              const urgent = !expired && c.expiry <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
              return (
                <tr key={c.id} className={`hover:bg-[#F8F9FB] ${expired ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="font-semibold text-[#191F28]">{c.store_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4E5968]">{c.building_name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">{c.category}</span>
                  </td>
                  <td className="px-4 py-3 text-[#4E5968] max-w-[180px] truncate">{c.title}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: c.color }}>{c.discount}</td>
                  <td className={`px-4 py-3 font-semibold ${expired ? "text-[#9CA3AF]" : urgent ? "text-[#F04452]" : "text-[#4E5968]"}`}>
                    {expired ? "⚠ 만료" : urgent ? `⏰ D-${Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000)}` : c.expiry}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.active ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {c.active ? "활성" : "비활성"}
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

      {modal && (
        <CouponModal
          initial={modal === "add" ? null : modal as AdminCoupon}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
