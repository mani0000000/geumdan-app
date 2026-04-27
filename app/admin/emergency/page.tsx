"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw, DatabaseZap, Baby, Siren } from "lucide-react";
import {
  adminFetchEmergencyRooms, adminUpsertEmergencyRoom, adminDeleteEmergencyRoom, seedEmergencyRooms,
  type AdminEmergencyRoom,
} from "@/lib/db/admin-health";
import ImageUpload from "@/components/ui/ImageUpload";

const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const SELECT = INPUT + " bg-white";

const LEVELS = ["권역응급의료센터", "지역응급의료기관", "지역응급의료센터", "기타"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</label>
      {children}
    </div>
  );
}

function newId() { return "er_" + Date.now().toString(36); }

const EMPTY: AdminEmergencyRoom = {
  id: "", name: "", address: "", phone: "",
  distance_km: null, is_pediatric: false,
  level: "지역응급의료기관",
  logo_url: null,
};

function EmergencyModal({ initial, onSave, onClose }: {
  initial: AdminEmergencyRoom | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdminEmergencyRoom>(
    initial ?? { ...EMPTY, id: newId() }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof AdminEmergencyRoom>(k: K, v: AdminEmergencyRoom[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("병원명을 입력하세요."); return; }
    if (!form.address.trim()) { setErr("주소를 입력하세요."); return; }
    setSaving(true);
    try {
      try {
        await adminUpsertEmergencyRoom(form);
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (msg.includes("PGRST204") || msg.includes("logo_url") || msg.includes("schema cache")) {
          await fetch("/api/admin/init-db", { method: "POST" });
          await adminUpsertEmergencyRoom(form);
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
          <h2 className="text-[15px] font-bold">{initial ? "응급실 수정" : "응급실 추가"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[80vh]">
          <div className="px-6 py-4 space-y-3">
            <Field label="병원명 *">
              <input className={INPUT} value={form.name}
                onChange={e => set("name", e.target.value)} placeholder="검단탑병원" />
            </Field>
            <Field label="주소 *">
              <input className={INPUT} value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="인천 서구 청마로 19번길 5 (당하동)" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="전화번호">
                <input className={INPUT} value={form.phone}
                  onChange={e => set("phone", e.target.value)} placeholder="032-590-0114" />
              </Field>
              <Field label="거리 (km)">
                <input className={INPUT} type="number" step="0.1" min="0"
                  value={form.distance_km ?? ""}
                  onChange={e => set("distance_km", e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="1.5" />
              </Field>
            </div>
            <Field label="응급실 등급">
              <select className={SELECT} value={form.level}
                onChange={e => set("level", e.target.value)}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_pediatric}
                onChange={e => set("is_pediatric", e.target.checked)} className="w-4 h-4" />
              <span className="text-[13px] text-[#4E5968]">소아응급실 운영</span>
            </label>

            {/* 로고/사진 */}
            <Field label="로고 또는 사진 (선택)">
              <ImageUpload
                value={form.logo_url}
                onChange={url => set("logo_url", url)}
                folder="emergency"
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

function LevelBadge({ level }: { level: string }) {
  const isRegional = level.includes("권역");
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap
      ${isRegional ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
      {level}
    </span>
  );
}

export default function AdminEmergencyPage() {
  const [items, setItems] = useState<AdminEmergencyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [modal, setModal] = useState<"add" | AdminEmergencyRoom | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminFetchEmergencyRooms()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/init-db", { method: "POST" }).catch(() => {});
  }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}'을(를) 삭제할까요?`)) return;
    await adminDeleteEmergencyRoom(id);
    load();
  }

  async function handleSeed() {
    if (!confirm("기본 응급실 데이터(5개)를 DB에 삽입할까요? 동일 ID 항목은 덮어씁니다.")) return;
    setSeeding(true);
    try {
      await seedEmergencyRooms();
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "시드 실패");
    } finally { setSeeding(false); }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">응급실 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">DB: emergency_rooms 테이블 · {items.length}개</p>
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
            <Plus size={15} /> 응급실 추가
          </button>
        </div>
      </div>

      {/* 데스크탑 테이블 */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
            <tr>
              {["병원명", "주소", "전화번호", "거리", "등급", "소아응급", "수정/삭제"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#B0B8C1]">응급실 정보 없음 · "기본 데이터 삽입"으로 시작하세요</td></tr>
            ) : items.map(r => (
              <tr key={r.id} className="hover:bg-[#F8F9FB]">
                <td className="px-4 py-3 font-semibold text-[#191F28] whitespace-nowrap">{r.name}</td>
                <td className="px-4 py-3 text-[#4E5968] max-w-[220px] truncate">{r.address}</td>
                <td className="px-4 py-3 text-[#4E5968] whitespace-nowrap">{r.phone || "—"}</td>
                <td className="px-4 py-3 text-[#4E5968] whitespace-nowrap">
                  {r.distance_km != null ? `${r.distance_km}km` : "—"}
                </td>
                <td className="px-4 py-3"><LevelBadge level={r.level} /></td>
                <td className="px-4 py-3">
                  {r.is_pediatric
                    ? <span className="flex items-center gap-1 text-[#059669] text-[11px] font-bold"><Baby size={12} /> 운영</span>
                    : <span className="text-[#B0B8C1] text-[11px]">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => setModal(r)}
                      className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(r.id, r.name)}
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
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">응급실 정보 없음 · "기본 데이터 삽입"으로 시작하세요</div>
        ) : items.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-[14px] text-[#191F28]">{r.name}</p>
                  {r.is_pediatric && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#059669] bg-[#D1FAE5] px-1.5 py-0.5 rounded-full">
                      <Baby size={10} /> 소아
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#8B95A1]">{r.address}</p>
              </div>
              <LevelBadge level={r.level} />
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[#4E5968] mb-3">
              <span className="flex items-center gap-1"><Siren size={11} className="text-[#F04452]" /> 24시간 응급</span>
              <span>{r.phone}</span>
              {r.distance_km != null && <span className="text-[#8B95A1]">{r.distance_km}km</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal(r)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#3182F6] hover:bg-[#EFF6FF]">
                <Pencil size={13} /> 수정
              </button>
              <button onClick={() => handleDelete(r.id, r.name)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#F04452] hover:bg-[#FFF0F0]">
                <Trash2 size={13} /> 삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <EmergencyModal
          initial={modal === "add" ? null : modal as AdminEmergencyRoom}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
