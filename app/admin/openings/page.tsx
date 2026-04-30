"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  adminFetchOpenings, adminUpsertOpening, adminDeleteOpening,
  type AdminOpening,
} from "@/lib/db/admin-stores";
import type { StoreCategory } from "@/lib/types";

const CATS: StoreCategory[] = [
  "카페", "음식점", "편의점", "병원/약국", "미용", "학원", "마트",
  "베이커리", "부동산", "스터디카페", "안경원", "꽃집",
  "기타",
];
const EMOJIS = ["🏪", "🍽️", "☕", "💄", "💇", "🧘", "📚", "💊", "🛒", "🏦", "✂️", "🥐", "🏘️", "📖", "👓", "💐"];
const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const SELECT = INPUT + " bg-white";
const TEXTAREA = INPUT + " resize-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</label>
      {children}
    </div>
  );
}

function newId() { return "ns_" + Date.now().toString(36); }

const EMPTY: AdminOpening = {
  id: "", store_id: "", store_name: "", category: "기타",
  floor: "1F", open_date: new Date().toISOString().slice(0, 10),
  emoji: "🏪", open_benefit: null, active: true,
};

function OpeningModal({ initial, onSave, onClose }: {
  initial: AdminOpening | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdminOpening>(
    initial ?? { ...EMPTY, id: newId() }
  );
  // 혜택 필드 별도 관리
  const [benefitSummary, setBenefitSummary] = useState(initial?.open_benefit?.summary ?? "");
  const [benefitDetails, setBenefitDetails] = useState(
    (initial?.open_benefit?.details ?? []).join("\n")
  );
  const [benefitUntil, setBenefitUntil] = useState(initial?.open_benefit?.validUntil ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof AdminOpening>(k: K, v: AdminOpening[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.store_name.trim()) { setErr("매장명을 입력하세요."); return; }
    if (!form.open_date) { setErr("오픈일을 입력하세요."); return; }

    const benefit = benefitSummary.trim()
      ? {
          summary: benefitSummary.trim(),
          details: benefitDetails.split("\n").map(l => l.trim()).filter(Boolean),
          validUntil: benefitUntil || undefined,
        }
      : null;

    setSaving(true);
    try {
      await adminUpsertOpening({ ...form, open_benefit: benefit });
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
          <h2 className="text-[15px] font-bold">{initial ? "신규오픈 수정" : "신규오픈 추가"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[75vh]">
          <div className="px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="매장명 *">
                <input className={INPUT} value={form.store_name}
                  onChange={e => set("store_name", e.target.value)} placeholder="더본코리아" />
              </Field>
              <Field label="매장 ID (stores.id)">
                <input className={INPUT} value={form.store_id}
                  onChange={e => set("store_id", e.target.value)} placeholder="s_... (선택)" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="업종">
                <select className={SELECT} value={form.category}
                  onChange={e => set("category", e.target.value as StoreCategory)}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="위치(층)">
                <input className={INPUT} value={form.floor}
                  onChange={e => set("floor", e.target.value)} placeholder="1F" />
              </Field>
              <Field label="이모지">
                <select className={SELECT} value={form.emoji}
                  onChange={e => set("emoji", e.target.value)}>
                  {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
            </div>
            <Field label="오픈일 *">
              <input className={INPUT} type="date" value={form.open_date}
                onChange={e => set("open_date", e.target.value)} />
            </Field>

            {/* 오픈 혜택 */}
            <div className="border border-[#E5E8EB] rounded-xl p-3 space-y-2">
              <p className="text-[12px] font-bold text-[#8B95A1]">오픈 혜택 (선택)</p>
              <Field label="혜택 요약 (1줄)">
                <input className={INPUT} value={benefitSummary}
                  onChange={e => setBenefitSummary(e.target.value)}
                  placeholder="오픈 기념 전 메뉴 20% 할인 + 음료 무료" />
              </Field>
              <Field label="혜택 상세 (줄바꿈으로 구분)">
                <textarea className={TEXTAREA} rows={4} value={benefitDetails}
                  onChange={e => setBenefitDetails(e.target.value)}
                  placeholder={"전 메뉴 20% 할인 (4/30까지)\n1인 1음료 무료 제공\nSNS 리뷰 작성 시 디저트 증정"} />
              </Field>
              <Field label="혜택 기간 종료일">
                <input className={INPUT} type="date" value={benefitUntil}
                  onChange={e => setBenefitUntil(e.target.value)} />
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

export default function AdminOpeningsPage() {
  const [items, setItems] = useState<AdminOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | AdminOpening | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminFetchOpenings()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}' 오픈 정보를 삭제할까요?`)) return;
    await adminDeleteOpening(id);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  function badge(openDate: string) {
    const d = new Date(openDate);
    const now = new Date();
    const mon = new Date(now);
    const day = now.getDay();
    mon.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    if (d >= mon && d <= sun) return { label: "이번주", cls: "bg-[#FEE2E2] text-[#991B1B]" };
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
      return { label: "이번달", cls: "bg-[#FEF3C7] text-[#92400E]" };
    return { label: "지난달", cls: "bg-[#F3F4F6] text-[#6B7280]" };
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">신규오픈 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">DB: store_openings 테이블 · {items.length}개</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold hover:bg-[#2563EB]">
            <Plus size={15} /> 오픈 추가
          </button>
        </div>
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
            <tr>
              {["", "매장명", "업종", "층", "오픈일", "혜택 요약", "상태", "수정/삭제"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">신규오픈 정보 없음</td></tr>
            ) : items.map(o => {
              const b = badge(o.open_date);
              const past = o.open_date < today;
              return (
                <tr key={o.id} className={`hover:bg-[#F8F9FB] ${past && !o.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-xl">{o.emoji}</td>
                  <td className="px-4 py-3 font-semibold text-[#191F28]">{o.store_name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">{o.category}</span>
                  </td>
                  <td className="px-4 py-3 text-[#4E5968]">{o.floor}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#4E5968]">{o.open_date}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4E5968] max-w-[220px] truncate">
                    {o.open_benefit?.summary ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${o.active ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {o.active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setModal(o)} className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(o.id, o.store_name)} className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]"><Trash2 size={13} /></button>
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
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">신규오픈 정보 없음</div>
        ) : items.map(o => {
          const b = badge(o.open_date);
          const past = o.open_date < today;
          return (
            <div key={o.id} className={`bg-white rounded-2xl border border-[#E5E8EB] p-4 ${past && !o.active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                  <span className="text-xl shrink-0">{o.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-[#191F28] truncate">{o.store_name}</p>
                    <p className="text-[12px] text-[#8B95A1]">{o.floor}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${o.active ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                  {o.active ? "활성" : "비활성"}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">{o.category}</span>
                <span className="text-[12px] text-[#4E5968]">{o.open_date}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal(o)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#3182F6] hover:bg-[#EFF6FF]">
                  <Pencil size={13} /> 수정
                </button>
                <button onClick={() => handleDelete(o.id, o.store_name)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#F04452] hover:bg-[#FFF0F0]">
                  <Trash2 size={13} /> 삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <OpeningModal
          initial={modal === "add" ? null : modal as AdminOpening}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
