"use client";
import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown,
  Image as ImageIcon, X, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchBanners, adminCreateBanner, adminUpdateBanner, adminDeleteBanner,
  type Banner,
} from "@/lib/db/banners";

const BADGE_PRESETS = ["SALE", "NEW", "HOT", "EVENT", "FREE", "COUPON", "GIFT"];
const BADGE_COLOR_PRESETS = [
  { label: "레드",   value: "#F04452" },
  { label: "옐로",  value: "#FFD600" },
  { label: "골드",   value: "#F59E0B" },
  { label: "크림",   value: "#FDE68A" },
  { label: "화이트", value: "#FFFFFF" },
  { label: "블루",   value: "#0071e3" },
  { label: "그린",   value: "#00C471" },
];

const EMPTY_FORM = {
  sort_order: 1,
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  link_label: "자세히 보기",
  bg_from: "#0071e3",
  bg_to: "#1849A3",
  badge: "",
  badge_color: "#F04452",
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at:   new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  active: true,
};

type FormData = typeof EMPTY_FORM;

function toLocalInput(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch { return iso.slice(0, 16); }
}

function fromLocalInput(local: string) {
  return new Date(local).toISOString();
}

const BADGE_LIGHT = new Set(["#FDE68A", "#FFD600", "#FFFFFF", "#F59E0B"]);
function badgeTextColor(c: string) {
  return BADGE_LIGHT.has(c.toUpperCase()) || BADGE_LIGHT.has(c) ? "#1d1d1f" : "#fff";
}

function BannerPreview({ form }: { form: FormData }) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [form.image_url]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: 160 }}>
      {form.image_url && !imgFailed ? (
        <img src={form.image_url} alt="" onError={() => setImgFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${form.bg_from}, ${form.bg_to})` }} />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${form.bg_from}cc 0%, transparent 55%, rgba(0,0,0,.55) 100%)` }} />
      {form.badge && (
        <div className="absolute top-3 left-3">
          <span className="text-[11px] font-black px-2.5 py-1 rounded-full" style={{ background: form.badge_color, color: badgeTextColor(form.badge_color) }}>
            {form.badge}
          </span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
        <p className="text-[18px] font-black text-white leading-tight drop-shadow">{form.title || "배너 제목"}</p>
        {form.subtitle && <p className="text-[12px] text-white/80 mt-1">{form.subtitle}</p>}
        {form.link_url && (
          <span className="mt-2.5 inline-flex items-center h-7 px-3 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30">
            {form.link_label || "자세히 보기"} →
          </span>
        )}
      </div>
    </div>
  );
}

function BannerRow({
  b, idx, total, deletingId, onMoveUp, onMoveDown, onToggle, onEdit, onDelete,
}: {
  b: Banner; idx: number; total: number; deletingId: string | null;
  onMoveUp: () => void; onMoveDown: () => void;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [imgFail, setImgFail] = useState(false);
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex">
      <div className="shrink-0 relative" style={{ width: 100, minHeight: 72 }}>
        {b.image_url && !imgFail ? (
          <img src={b.image_url} alt="" onError={() => setImgFail(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${b.bg_from}, ${b.bg_to})` }} />
        )}
        {b.badge && (
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: b.badge_color, color: badgeTextColor(b.badge_color) }}>
              {b.badge}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[12px] font-bold text-gray-400">#{b.sort_order}</span>
          <p className="text-[14px] font-bold text-[#191F28] truncate flex-1">{b.title}</p>
          <StatusBadge banner={b} />
        </div>
        {b.subtitle && <p className="text-[12px] text-gray-500 mt-0.5 truncate">{b.subtitle}</p>}
        <p className="text-[11px] text-gray-400 mt-1">
          {new Date(b.starts_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
          {" ~ "}
          {new Date(b.ends_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
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
          {b.active ? <Eye size={15} className="text-[#3182F6]" /> : <EyeOff size={15} className="text-gray-400" />}
        </button>
        <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <Pencil size={14} className="text-gray-500" />
        </button>
        <button onClick={onDelete} disabled={deletingId === b.id}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50">
          {deletingId === b.id
            ? <Loader2 size={14} className="animate-spin text-gray-400" />
            : <Trash2 size={14} className="text-red-400" />}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ banner }: { banner: Banner }) {
  const now = Date.now();
  const starts = new Date(banner.starts_at).getTime();
  const ends = new Date(banner.ends_at).getTime();
  if (!banner.active) return <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">비활성</span>;
  if (now < starts) return <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">예약</span>;
  if (now > ends)   return <span className="text-[11px] font-semibold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">만료</span>;
  return <span className="text-[11px] font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">● 노출 중</span>;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
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
    try { setBanners(await adminFetchBanners()); } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  function openCreate() {
    setForm({ ...EMPTY_FORM, sort_order: (banners[banners.length - 1]?.sort_order ?? 0) + 1 });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(b: Banner) {
    setForm({
      sort_order: b.sort_order,
      title: b.title,
      subtitle: b.subtitle ?? "",
      image_url: b.image_url ?? "",
      link_url: b.link_url ?? "",
      link_label: b.link_label,
      bg_from: b.bg_from,
      bg_to: b.bg_to,
      badge: b.badge ?? "",
      badge_color: b.badge_color,
      starts_at: toLocalInput(b.starts_at),
      ends_at:   toLocalInput(b.ends_at),
      active: b.active,
    });
    setEditingId(b.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { showToast("제목을 입력해 주세요", false); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        subtitle: form.subtitle || null,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        badge: form.badge || null,
        starts_at: fromLocalInput(form.starts_at),
        ends_at:   fromLocalInput(form.ends_at),
      };
      if (editingId) {
        await adminUpdateBanner(editingId, payload);
        showToast("배너가 수정됐어요");
      } else {
        await adminCreateBanner(payload);
        showToast("배너가 추가됐어요");
      }
      setShowForm(false);
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장 실패", false);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 배너를 삭제할까요?")) return;
    setDeletingId(id);
    try {
      await adminDeleteBanner(id);
      showToast("배너가 삭제됐어요");
      await reload();
    } catch { showToast("삭제 실패", false); }
    finally { setDeletingId(null); }
  }

  async function toggleActive(b: Banner) {
    try {
      await adminUpdateBanner(b.id, { active: !b.active });
      await reload();
    } catch { showToast("변경 실패", false); }
  }

  async function moveOrder(b: Banner, dir: -1 | 1) {
    const siblings = [...banners];
    const idx = siblings.findIndex(x => x.id === b.id);
    const target = siblings[idx + dir];
    if (!target) return;
    try {
      await Promise.all([
        adminUpdateBanner(b.id, { sort_order: target.sort_order }),
        adminUpdateBanner(target.id, { sort_order: b.sort_order }),
      ]);
      await reload();
    } catch { showToast("순서 변경 실패", false); }
  }

  const activeCount = banners.filter(b => {
    const now = Date.now();
    return b.active && new Date(b.starts_at).getTime() <= now && new Date(b.ends_at).getTime() >= now;
  }).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#191F28]">배너 관리</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            전체 {banners.length}개 · 현재 노출 {activeCount}개 (최대 20슬롯)
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={banners.length >= 20}
          className="flex items-center gap-2 h-10 px-4 bg-[#3182F6] text-white rounded-xl text-[14px] font-bold active:opacity-80 disabled:opacity-40"
        >
          <Plus size={16} />새 배너
        </button>
      </div>

      {/* 배너 목록 */}
      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-gray-400">
          <Loader2 size={20} className="animate-spin" />불러오는 중...
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-gray-400">
          <ImageIcon size={36} />
          <p className="text-[14px]">배너가 없습니다. 새 배너를 추가해 보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b, idx) => (
            <BannerRow
              key={b.id}
              b={b} idx={idx} total={banners.length} deletingId={deletingId}
              onMoveUp={() => moveOrder(b, -1)}
              onMoveDown={() => moveOrder(b, 1)}
              onToggle={() => toggleActive(b)}
              onEdit={() => openEdit(b)}
              onDelete={() => handleDelete(b.id)}
            />
          ))}
        </div>
      )}

      {/* 추가/편집 폼 — 바텀 시트 */}
      {showForm && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-t-3xl"
            style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}>
            {/* 시트 헤더 */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-[17px] font-extrabold text-[#191F28]">
                {editingId ? "배너 편집" : "새 배너 추가"}
              </p>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* 미리보기 */}
              <BannerPreview form={form} />

              {/* 제목 / 부제목 */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">제목 *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="예: 봄맞이 상가 대축제"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">부제목</label>
                <input
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="예: 참여 매장 최대 30% 할인"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                />
              </div>

              {/* 이미지 업로드 */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">이미지</label>
                <ImageUpload
                  value={form.image_url}
                  onChange={url => setForm(f => ({ ...f, image_url: url ?? "" }))}
                  folder="banners"
                />
                <p className="text-[11px] text-gray-400">이미지가 없으면 아래 배경 그라디언트를 사용합니다</p>
              </div>

              {/* 배경 그라디언트 */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">배경 그라디언트</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-1">시작 색</p>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 h-11">
                      <input type="color" value={form.bg_from} onChange={e => setForm(f => ({ ...f, bg_from: e.target.value }))}
                        className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <span className="text-[13px] text-gray-600 font-mono">{form.bg_from}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-1">끝 색</p>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 h-11">
                      <input type="color" value={form.bg_to} onChange={e => setForm(f => ({ ...f, bg_to: e.target.value }))}
                        className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <span className="text-[13px] text-gray-600 font-mono">{form.bg_to}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 배지 */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">배지</label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_PRESETS.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, badge: f.badge === p ? "" : p }))}
                      className={`h-8 px-3 rounded-lg text-[12px] font-bold border transition-colors ${
                        form.badge === p ? "bg-[#3182F6] text-white border-[#3182F6]" : "bg-white text-gray-600 border-gray-200"
                      }`}>
                      {p}
                    </button>
                  ))}
                  <input
                    value={form.badge}
                    onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                    placeholder="직접 입력"
                    className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] w-24 focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-gray-400">배지 색상</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {BADGE_COLOR_PRESETS.map(c => (
                      <button key={c.value}
                        onClick={() => setForm(f => ({ ...f, badge_color: c.value }))}
                        className={`h-7 px-3 rounded-full text-[11px] font-bold border-2 transition-all ${
                          form.badge_color === c.value ? "border-[#3182F6] scale-110" : "border-transparent"
                        }`}
                        style={{ background: c.value, color: badgeTextColor(c.value) }}>
                        {c.label}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 border border-gray-200 rounded-full px-2 h-7">
                      <input type="color" value={form.badge_color} onChange={e => setForm(f => ({ ...f, badge_color: e.target.value }))}
                        className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent p-0" />
                      <span className="text-[11px] text-gray-500 font-mono">{form.badge_color}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 링크 */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">링크 URL</label>
                <input
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https:// 또는 /stores, /community 등"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">링크 버튼 텍스트</label>
                <input
                  value={form.link_label}
                  onChange={e => setForm(f => ({ ...f, link_label: e.target.value }))}
                  placeholder="자세히 보기"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                />
              </div>

              {/* 노출 기간 */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-600">노출 기간</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-1">시작</p>
                    <input type="datetime-local" value={form.starts_at}
                      onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 mb-1">종료</p>
                    <input type="datetime-local" value={form.ends_at}
                      onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
                  </div>
                </div>
              </div>

              {/* 순서 + 활성화 */}
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-[12px] font-bold text-gray-600">노출 순서</label>
                  <input type="number" min={1} max={20} value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-600">활성화</label>
                  <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                    className={`flex items-center gap-2 h-11 px-4 rounded-xl font-bold text-[14px] border-2 transition-colors ${
                      form.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                    }`}>
                    {form.active ? <Eye size={15} /> : <EyeOff size={15} />}
                    {form.active ? "활성" : "비활성"}
                  </button>
                </div>
              </div>

              <div className="pb-4" />
            </div>

            {/* 저장 버튼 */}
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

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-[14px] font-semibold text-white ${toast.ok ? "bg-[#191F28]" : "bg-red-500"}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
