"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  fetchNotices, adminUpsertNotice, adminDeleteNotice,
  type Notice,
} from "@/lib/db/notices";
import ImageUpload from "@/components/ui/ImageUpload";

const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const TEXTAREA = INPUT + " resize-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</label>
      {children}
    </div>
  );
}

function newId() { return "notice_" + Date.now().toString(36); }

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

type ModalMode = "add" | Notice;

function NoticeModal({ initial, onSave, onClose }: {
  initial: Notice | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Notice>(
    initial ?? {
      id: newId(),
      title: "",
      content: "",
      image_url: null,
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof Notice>(k: K, v: Notice[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setErr("제목을 입력하세요."); return; }
    if (!form.content.trim()) { setErr("내용을 입력하세요."); return; }
    setSaving(true);
    try {
      await adminUpsertNotice(form);
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
          <h2 className="text-[15px] font-bold">{initial ? "공지 수정" : "공지 추가"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[75vh]">
          <div className="px-6 py-4 space-y-3">
            <Field label="제목 *">
              <input className={INPUT} value={form.title}
                onChange={e => set("title", e.target.value)} placeholder="공지사항 제목" />
            </Field>
            <Field label="내용 *">
              <textarea className={TEXTAREA} rows={6} value={form.content}
                onChange={e => set("content", e.target.value)} placeholder="공지사항 내용을 입력하세요." />
            </Field>
            <Field label="이미지 URL (선택)">
              <input className={INPUT} value={form.image_url ?? ""}
                onChange={e => set("image_url", e.target.value || null)}
                placeholder="https://..." />
            </Field>
            <div>
              <p className="text-[11px] font-semibold text-[#8B95A1] mb-1">또는 이미지 업로드:</p>
              <ImageUpload
                value={form.image_url ?? ""}
                onChange={url => set("image_url", url || null)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_pinned}
                onChange={e => set("is_pinned", e.target.checked)} className="w-4 h-4" />
              <span className="text-[13px] text-[#4E5968]">📌 상단 고정</span>
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

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotices(await fetchNotices()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`'${title}' 공지를 삭제할까요?`)) return;
    await adminDeleteNotice(id);
    load();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">공지사항 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">DB: notices 테이블 · {notices.length}개</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold hover:bg-[#2563EB]">
            <Plus size={15} /> 공지 추가
          </button>
        </div>
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F8F9FB] border-b border-[#E5E8EB]">
            <tr>
              {["고정", "제목", "이미지", "작성일", "수정/삭제"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-[#8B95A1]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F6]">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#B0B8C1]">로딩 중...</td></tr>
            ) : notices.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#B0B8C1]">공지 없음</td></tr>
            ) : notices.map(n => (
              <tr key={n.id} className="hover:bg-[#F8F9FB]">
                <td className="px-4 py-3">
                  {n.is_pinned && <span className="text-[12px]">📌</span>}
                </td>
                <td className="px-4 py-3 font-semibold text-[#191F28] max-w-[280px] truncate">{n.title}</td>
                <td className="px-4 py-3">
                  {n.image_url ? (
                    <img src={n.image_url} alt={n.title} className="w-10 h-10 object-cover rounded-lg" />
                  ) : (
                    <span className="text-[#B0B8C1]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#4E5968]">{formatDate(n.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => setModal(n)} className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(n.id, n.title)} className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]"><Trash2 size={13} /></button>
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
        ) : notices.length === 0 ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">공지 없음</div>
        ) : notices.map(n => (
          <div key={n.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
            <div className="flex items-start gap-3 mb-3">
              {n.image_url && (
                <img src={n.image_url} alt={n.title} className="w-14 h-14 object-cover rounded-xl shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {n.is_pinned && <span className="text-[12px]">📌</span>}
                  <p className="font-bold text-[14px] text-[#191F28] truncate">{n.title}</p>
                </div>
                <p className="text-[12px] text-[#8B95A1]">{formatDate(n.created_at)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal(n)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#3182F6] hover:bg-[#EFF6FF]">
                <Pencil size={13} /> 수정
              </button>
              <button onClick={() => handleDelete(n.id, n.title)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E8EB] rounded-xl text-[13px] text-[#F04452] hover:bg-[#FFF0F0]">
                <Trash2 size={13} /> 삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <NoticeModal
          initial={modal === "add" ? null : modal as Notice}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
