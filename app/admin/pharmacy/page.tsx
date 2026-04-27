"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw, DatabaseZap, Moon, Clock } from "lucide-react";
import {
  adminFetchPharmacies, adminUpsertPharmacy, adminDeletePharmacy, seedPharmacies,
  type AdminPharmacy,
} from "@/lib/db/admin-health";
import ImageUpload from "@/components/ui/ImageUpload";

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

function newId() { return "ph_" + Date.now().toString(36); }

const EMPTY: AdminPharmacy = {
  id: "", name: "", address: "", phone: "",
  weekday_hours: "", weekend_hours: "", night_hours: "",
  is_night_pharmacy: false, is_weekend_pharmacy: false,
  logo_url: null,
};

function PharmacyModal({ initial, onSave, onClose }: {
  initial: AdminPharmacy | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdminPharmacy>(
    initial ?? { ...EMPTY, id: newId() }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof AdminPharmacy>(k: K, v: AdminPharmacy[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("약국명을 입력하세요."); return; }
    if (!form.address.trim()) { setErr("주소를 입력하세요."); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        weekday_hours: form.weekday_hours || null,
        weekend_hours: form.weekend_hours || null,
        night_hours: form.night_hours || null,
      };
      try {
        await adminUpsertPharmacy(payload);
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (msg.includes("PGRST204") || msg.includes("logo_url") || msg.includes("schema cache")) {
          await fetch("/api/admin/init-db", { method: "POST" });
          await adminUpsertPharmacy(payload);
        } else {
          throw firstErr;
        }
      }
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
          <h2 className="text-[15px] font-bold">{initial ? "약국 수정" : "약국 추가"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[80vh]">
          <div className="px-6 py-4 space-y-3">
            <Field label="약국명 *">
              <input className={INPUT} value={form.name}
                onChange={e => set("name", e.target.value)} placeholder="가온약국" />
            </Field>
            <Field label="주소 *">
              <input className={INPUT} value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="인천 서구 봉오재 3로 90 (검단동)" />
            </Field>
            <Field label="전화번호">
              <input className={INPUT} value={form.phone}
                onChange={e => set("phone", e.target.value)} placeholder="032-567-0879" />
            </Field>

            {/* 영업시간 */}
            <div className="border border-[#E5E8EB] rounded-xl p-3 space-y-2">
              <p className="text-[12px] font-bold text-[#8B95A1]">영업시간</p>
              <Field label="평일 영업시간">
                <input className={INPUT} value={form.weekday_hours ?? ""}
                  onChange={e => set("weekday_hours", e.target.value)}
                  placeholder="09:00~21:00" />
              </Field>
              <Field label="주말 영업시간 (없으면 비워두세요)">
                <input className={INPUT} value={form.weekend_hours ?? ""}
                  onChange={e => set("weekend_hours", e.target.value)}
                  placeholder="토·일 10:00~18:00" />
              </Field>
              <Field label="심야 영업시간 (없으면 비워두세요)">
                <input className={INPUT} value={form.night_hours ?? ""}
                  onChange={e => set("night_hours", e.target.value)}
                  placeholder="매일 22:00~01:00" />
              </Field>
            </div>

            {/* 태그 */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_night_pharmacy}
                  onChange={e => set("is_night_pharmacy", e.target.checked)} className="w-4 h-4" />
                <span className="text-[13px] text-[#4E5968]">심야약국</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_weekend_pharmacy}
                  onChange={e => set("is_weekend_pharmacy", e.target.checked)} className="w-4 h-4" />
                <span className="text-[13px] text-[#4E5968]">주말약국</span>
              </label>
            </div>

            {/* 로고/사진 */}
            <Field label="로고 또는 사진 (선택)">
              <ImageUpload
                value={form.logo_url}
                onChange={url => set("logo_url", url)}
                folder="pharmacies"
              />
            </Field>

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

function TagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}

export default function AdminPharmacyPage() {
  const [items, setItems] = useState<AdminPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [modal, setModal] = useState<"add" | AdminPharmacy | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminFetchPharmacies()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/init-db", { method: "POST" }).catch(() => {});
  }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}'을(를) 삭제할까요?`)) return;
    await adminDeletePharmacy(id);
    load();
  }

  async function handleSeed() {
    if (!confirm("기본 약국 데이터(6개)를 DB에 삽입할까요? 동일 ID 항목은 덮어씁니다.")) return;
    setSeeding(true);
    try {
      await seedPharmacies();
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "시드 실패");
    } finally { setSeeding(false); }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">약국 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">DB: pharmacies 테이블 · {items.length}개</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={load}
            className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#4E5968] hover:bg-[#F2F4F6] disabled:opacity-50">
            <DatabaseZap size={14} className={seeding ? "animate-pulse text-[#3182F6]" : ""} />
            {seeding ? "삽입 중..." : "기본 데이터 삽입"}
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold hover:bg-[#2563EB]">
            <Plus size={15} /> 약국 추가
          </button>
        </div>
      </div>

      {/* 데스크탑 테이블 */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
            <tr>
              {["약국명", "주소", "전화번호", "평일", "주말", "심야", "태그", "수정/삭제"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C1]">약국 정보 없음 · "기본 데이터 삽입"으로 시작하세요</td></tr>
            ) : items.map(p => (
              <tr key={p.id} className="hover:bg-[#F8F9FB]">
                <td className="px-4 py-3 font-semibold text-[#191F28] whitespace-nowrap">{p.name}</td>
                <td className="px-4 py-3 text-[#4E5968] max-w-[200px] truncate">{p.address}</td>
                <td className="px-4 py-3 text-[#4E5968] whitespace-nowrap">{p.phone || "—"}</td>
                <td className="px-4 py-3 text-[#4E5968] whitespace-nowrap">{p.weekday_hours || "—"}</td>
                <td className="px-4 py-3 text-[#4E5968] whitespace-nowrap">{p.weekend_hours || <span className="text-[#B0B8C1]">미운영</span>}</td>
                <td className="px-4 py-3 text-[#4E5968] whitespace-nowrap">{p.night_hours || <span className="text-[#B0B8C1]">미운영</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {p.is_night_pharmacy && <TagBadge label="심야" color="bg-[#EDE9FE] text-[#6D28D9]" />}
                    {p.is_weekend_pharmacy && <TagBadge label="주말" color="bg-[#DBEAFE] text-[#1D4ED8]" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => setModal(p)}
                      className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">약국 정보 없음 · "기본 데이터 삽입"으로 시작하세요</div>
        ) : items.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-[14px] text-[#191F28]">{p.name}</p>
                <p className="text-[12px] text-[#8B95A1] mt-0.5">{p.address}</p>
              </div>
              <div className="flex gap-1">
                {p.is_night_pharmacy && <TagBadge label="심야" color="bg-[#EDE9FE] text-[#6D28D9]" />}
                {p.is_weekend_pharmacy && <TagBadge label="주말" color="bg-[#DBEAFE] text-[#1D4ED8]" />}
              </div>
            </div>
            <div className="space-y-1 text-[12px] text-[#4E5968] mb-3">
              <div className="flex items-center gap-1.5"><Clock size={11} className="text-[#8B95A1]" /> 평일 {p.weekday_hours || "—"}</div>
              {p.weekend_hours && <div className="flex items-center gap-1.5"><Clock size={11} className="text-[#8B95A1]" /> 주말 {p.weekend_hours}</div>}
              {p.night_hours && <div className="flex items-center gap-1.5"><Moon size={11} className="text-[#8B95A1]" /> 심야 {p.night_hours}</div>}
              <div className="text-[#8B95A1]">{p.phone}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal(p)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#3182F6] hover:bg-[#EFF6FF]">
                <Pencil size={13} /> 수정
              </button>
              <button onClick={() => handleDelete(p.id, p.name)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#F04452] hover:bg-[#FFF0F0]">
                <Trash2 size={13} /> 삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <PharmacyModal
          initial={modal === "add" ? null : modal as AdminPharmacy}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
