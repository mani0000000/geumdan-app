"use client";
import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown,
  Image as ImageIcon, X, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchPopups, adminCreatePopup, adminUpdatePopup, adminDeletePopup,
  type Popup,
} from "@/lib/db/popups";

const EMPTY_FORM = {
  sort_order: 1,
  title: "",
  image_url: "",
  link_url: "",
  link_label: "자세히 보기",
  start_at: "",
  end_at: "",
  is_active: true,
};

type FormData = typeof EMPTY_FORM;

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 16); }
  catch { return ""; }
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

function StatusBadge({ p }: { p: Popup }) {
  const now = Date.now();
  const starts = p.start_at ? new Date(p.start_at).getTime() : -Infinity;
  const ends = p.end_at ? new Date(p.end_at).getTime() : Infinity;
  if (!p.is_active) return <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">비활성</span>;
  if (now < starts) return <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">예약</span>;
  if (now > ends)   return <span className="text-[11px] font-semibold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">만료</span>;
  return <span className="text-[11px] font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">● 노출 중</span>;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "제한 없음";
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function PopupRow({
  p, idx, total, deletingId, onMoveUp, onMoveDown, onToggle, onEdit, onDelete,
}: {
  p: Popup; idx: number; total: number; deletingId: string | null;
  onMoveUp: () => void; onMoveDown: () => void;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [imgFail, setImgFail] = useState(false);
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex">
      <div className="shrink-0 relative bg-gray-100" style={{ width: 90, minHeight: 72 }}>
        {p.image_url && !imgFail ? (
          <img src={p.image_url} alt="" onError={() => setImgFail(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImageIcon size={20} />
          </div>
        )}
      </div>
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[12px] font-bold text-gray-400">#{p.sort_order}</span>
          <p className="text-[14px] font-bold text-[#191F28] truncate flex-1">{p.title || "(제목 없음)"}</p>
          <StatusBadge p={p} />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {fmt(p.start_at)} ~ {fmt(p.end_at)}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-2 border-l border-gray-100">
        <button onClick={onMoveUp} disabled={idx === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-20">
          <ChevronUp size={16} className="text-gray-500" />
        </button>
        <button onClick={onMoveDown} disabled={idx === total - 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-20">
          <ChevronDown size={16} className="text-gray-500" />
        </button>
        <button onClick={onToggle} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
          {p.is_active ? <Eye size={15} className="text-[#3182F6]" /> : <EyeOff size={15} className="text-gray-400" />}
        </button>
        <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <Pencil size={14} className="text-gray-500" />
        </button>
        <button onClick={onDelete} disabled={deletingId === p.id}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50">
          {deletingId === p.id
            ? <Loader2 size={14} className="animate-spin text-gray-400" />
            : <Trash2 size={14} className="text-red-400" />}
        </button>
      </div>
    </div>
  );
}

export default function AdminPopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  async function reload() {
    setLoading(true);
    try {
      setPopups(await adminFetchPopups());
    } catch (e) {
      showToast(e instanceof Error ? e.message : "데이터 로드 실패 — 콘솔 확인", false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  function openCreate() {
    setForm({ ...EMPTY_FORM, sort_order: (popups[popups.length - 1]?.sort_order ?? 0) + 1 });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(p: Popup) {
    setForm({
      sort_order: p.sort_order,
      title: p.title ?? "",
      image_url: p.image_url ?? "",
      link_url: p.link_url ?? "",
      link_label: p.link_label,
      start_at: toLocalInput(p.start_at),
      end_at: toLocalInput(p.end_at),
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.image_url.trim()) { showToast("팝업 이미지를 등록해 주세요", false); return; }
    setSaving(true);
    try {
      const payload = {
        sort_order: form.sort_order,
        title: form.title,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        link_label: form.link_label,
        start_at: fromLocalInput(form.start_at),
        end_at: fromLocalInput(form.end_at),
        is_active: form.is_active,
      };
      if (editingId) {
        await adminUpdatePopup(editingId, payload);
        showToast("팝업이 수정됐어요");
      } else {
        await adminCreatePopup(payload);
        showToast("팝업이 추가됐어요");
      }
      setShowForm(false);
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장 실패", false);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 팝업을 삭제할까요?")) return;
    setDeletingId(id);
    try {
      await adminDeletePopup(id);
      showToast("팝업이 삭제됐어요");
      await reload();
    } catch { showToast("삭제 실패", false); }
    finally { setDeletingId(null); }
  }

  async function toggleActive(p: Popup) {
    try {
      await adminUpdatePopup(p.id, { is_active: !p.is_active });
      await reload();
    } catch { showToast("변경 실패", false); }
  }

  async function moveOrder(p: Popup, dir: -1 | 1) {
    const siblings = [...popups];
    const idx = siblings.findIndex(x => x.id === p.id);
    const target = siblings[idx + dir];
    if (!target) return;
    try {
      await Promise.all([
        adminUpdatePopup(p.id, { sort_order: target.sort_order }),
        adminUpdatePopup(target.id, { sort_order: p.sort_order }),
      ]);
      await reload();
    } catch { showToast("순서 변경 실패", false); }
  }

  const activeCount = popups.filter(p => {
    const now = Date.now();
    const s = p.start_at ? new Date(p.start_at).getTime() : -Infinity;
    const e = p.end_at ? new Date(p.end_at).getTime() : Infinity;
    return p.is_active && s <= now && e >= now;
  }).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#191F28]">팝업 관리</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            전체 {popups.length}개 · 현재 노출 {activeCount}개
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-4 bg-[#3182F6] text-white rounded-xl text-[14px] font-bold active:opacity-80"
        >
          <Plus size={16} />새 팝업
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-gray-400">
          <Loader2 size={20} className="animate-spin" />불러오는 중...
        </div>
      ) : popups.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-gray-400">
          <ImageIcon size={36} />
          <p className="text-[14px]">팝업이 없습니다. 새 팝업을 추가해 보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {popups.map((p, idx) => (
            <PopupRow
              key={p.id}
              p={p} idx={idx} total={popups.length} deletingId={deletingId}
              onMoveUp={() => moveOrder(p, -1)}
              onMoveDown={() => moveOrder(p, 1)}
              onToggle={() => toggleActive(p)}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-t-3xl"
            style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}>
            <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-[17px] font-extrabold text-[#191F28]">
                {editingId ? "팝업 편집" : "새 팝업 추가"}
              </p>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">관리용 제목</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="예: 5월 봄맞이 이벤트 (앱에는 표시되지 않음)"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                />
                <p className="text-[11px] text-gray-400">목록 식별용으로만 쓰이며 팝업 본문에는 노출되지 않습니다</p>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">팝업 이미지 *</label>
                <ImageUpload
                  value={form.image_url}
                  onChange={url => setForm(f => ({ ...f, image_url: url ?? "" }))}
                  folder="popups"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">링크 URL</label>
                <input
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https:// 또는 /stores 등 (이미지 클릭 시 이동)"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">노출 기간 (비워두면 제한 없음)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-1">시작</p>
                    <input type="datetime-local" value={form.start_at}
                      onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-1">종료</p>
                    <input type="datetime-local" value={form.end_at}
                      onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-[12px] font-bold text-gray-600">노출 순서</label>
                  <input type="number" min={1} value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-600">활성화</label>
                  <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`flex items-center gap-2 h-11 px-4 rounded-xl font-bold text-[14px] border-2 transition-colors ${
                      form.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                    }`}>
                    {form.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                    {form.is_active ? "활성" : "비활성"}
                  </button>
                </div>
              </div>

              <div className="pb-4" />
            </div>

            <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-[15px] font-semibold text-gray-600 active:bg-gray-50">
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-2 h-12 px-8 rounded-xl bg-[#3182F6] text-white text-[15px] font-bold active:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingId ? "수정하기" : "추가하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-[14px] font-semibold text-white ${toast.ok ? "bg-[#191F28]" : "bg-red-500"}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
