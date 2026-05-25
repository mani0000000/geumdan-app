"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ChevronRight, Search, RefreshCw } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchBuildings,
  adminCreateBuilding,
  adminUpdateBuilding,
  adminDeleteBuilding,
  type AdminBuilding,
} from "@/lib/db/admin-stores";

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

// ─── 공통 Field 래퍼 ──────────────────────────────────────────
const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</label>
      {children}
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
      <div className="hidden md:block bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
            <tr>
              {["건물명", "주소", "층수", "매장수", "데이터", "층·매장 관리", "수정/삭제"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#B0B8C1]">건물 없음</td></tr>
            ) : filtered.map(b => (
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
            ))}
          </tbody>
        </table>
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
            <div className="flex items-center gap-2">
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
