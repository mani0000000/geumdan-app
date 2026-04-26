"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, ExternalLink, PlayCircle, Camera, Newspaper } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchNews, adminCreateNews, adminDeleteNews, type AdminNewsArticle,
  adminFetchYouTube, adminCreateYouTube, adminDeleteYouTube, type AdminYouTubeVideo,
  adminFetchInstagram, adminCreateInstagram, adminDeleteInstagram, type AdminInstagramPost,
} from "@/lib/db/admin-news";

// ── 유틸 ──────────────────────────────────────────────────────
function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function ytThumb(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const labelCls = "block text-[11px] font-semibold text-[#8B95A1] mb-1";

type Tab = "news" | "youtube" | "instagram";

// ── 뉴스 탭 ──────────────────────────────────────────────────
function NewsTab() {
  const [items, setItems] = useState<AdminNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const EMPTY = { title: "", url: "", source: "", summary: "", thumbnail: null as string | null, published_at: new Date().toISOString().slice(0, 16) };
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminFetchNews()); } catch (e) { setErr(String(e)); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) { setErr("제목과 URL은 필수입니다"); return; }
    setSaving(true); setErr("");
    try {
      await adminCreateNews({
        ...form,
        published_at: new Date(form.published_at).toISOString(),
      });
      setShowForm(false); setForm(EMPTY); await load();
    } catch (e) { setErr(String(e)); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    try { await adminDeleteNews(id); await load(); } catch (e) { setErr(String(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[#8B95A1]">수기 등록 뉴스 {items.length}건</p>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={14} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold hover:bg-[#2563EB]">
            <Plus size={14} /> 뉴스 추가
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E5E8EB] p-5 mb-5 space-y-4">
          <p className="text-[14px] font-bold text-[#191F28]">뉴스 추가</p>
          <div><label className={labelCls}>제목 *</label><input className={INPUT} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className={labelCls}>URL *</label><input className={INPUT} type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>출처</label><input className={INPUT} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="조선비즈" /></div>
            <div><label className={labelCls}>발행일</label><input className={INPUT} type="datetime-local" value={form.published_at} onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>요약</label><textarea className={INPUT + " resize-none h-20"} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} /></div>
          <div><label className={labelCls}>썸네일 이미지</label><ImageUpload value={form.thumbnail} onChange={url => setForm(f => ({ ...f, thumbnail: url }))} folder="news" /></div>
          {err && <p className="text-[12px] text-[#F04452]">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setErr(""); }}
              className="px-4 py-2 rounded-xl border border-[#E5E8EB] text-[13px] text-[#4E5968] hover:bg-[#F2F4F6]">취소</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#3182F6] text-white text-[13px] font-bold disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-[#8B95A1] text-[14px]">등록된 뉴스가 없습니다</div>
        ) : items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-[#E5E8EB] px-4 py-3 flex items-start gap-3">
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#191F28] line-clamp-2 leading-snug">{item.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[#3182F6] font-semibold">{item.source}</span>
                <span className="text-[11px] text-[#8B95A1]">{formatDate(item.published_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-[#F2F4F6]"><ExternalLink size={14} className="text-[#8B95A1]" /></a>
              <button onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-[#F04452]" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 유튜브 탭 ─────────────────────────────────────────────────
function YouTubeTab() {
  const [items, setItems] = useState<AdminYouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminFetchYouTube()); } catch (e) { setErr(String(e)); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function handleUrlChange(url: string) {
    setYtUrl(url);
    const id = extractVideoId(url);
    setPreview(id ? ytThumb(id) : null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const videoId = extractVideoId(ytUrl);
    if (!videoId) { setErr("올바른 YouTube URL을 입력하세요"); return; }
    if (!title.trim()) { setErr("제목을 입력하세요"); return; }
    setSaving(true); setErr("");
    try {
      await adminCreateYouTube({
        video_id: videoId,
        title: title.trim(),
        channel_name: channel.trim() || "YouTube",
        thumbnail: ytThumb(videoId),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        fetched_at: new Date().toISOString(),
      });
      setShowForm(false); setYtUrl(""); setTitle(""); setChannel(""); setPreview(null);
      await load();
    } catch (e) { setErr(String(e)); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    try { await adminDeleteYouTube(id); await load(); } catch (e) { setErr(String(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[#8B95A1]">등록된 영상 {items.length}건</p>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={14} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF0000] text-white rounded-xl text-[13px] font-bold hover:bg-[#CC0000]">
            <Plus size={14} /> 영상 추가
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E5E8EB] p-5 mb-5 space-y-4">
          <p className="text-[14px] font-bold text-[#191F28]">유튜브 영상 추가</p>
          <div>
            <label className={labelCls}>YouTube URL *</label>
            <input className={INPUT} value={ytUrl} onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          {preview && (
            <img src={preview} alt="미리보기" className="w-full max-w-xs rounded-xl" />
          )}
          <div><label className={labelCls}>제목 *</label><input className={INPUT} value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><label className={labelCls}>채널명</label><input className={INPUT} value={channel} onChange={e => setChannel(e.target.value)} placeholder="채널명 (선택)" /></div>
          {err && <p className="text-[12px] text-[#F04452]">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setErr(""); }}
              className="px-4 py-2 rounded-xl border border-[#E5E8EB] text-[13px] text-[#4E5968] hover:bg-[#F2F4F6]">취소</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#FF0000] text-white text-[13px] font-bold disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-video bg-white rounded-2xl animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-[#8B95A1] text-[14px]">등록된 영상이 없습니다</div>
        ) : items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
            <div className="relative">
              <img src={item.thumbnail ?? ytThumb(item.video_id)} alt={item.title}
                className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-[#FF0000]/90 rounded-full flex items-center justify-center">
                  <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white ml-1" />
                </div>
              </div>
            </div>
            <div className="p-3">
              <p className="text-[12px] font-semibold text-[#191F28] line-clamp-2 leading-snug">{item.title}</p>
              <p className="text-[11px] text-[#8B95A1] mt-0.5">{item.channel_name}</p>
              <div className="flex gap-1 mt-2">
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#F2F4F6] text-[11px] font-semibold text-[#4E5968]">
                  <ExternalLink size={11} /> 보기
                </a>
                <button onClick={() => handleDelete(item.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-[11px] font-semibold text-[#F04452]">
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 인스타그램 탭 ─────────────────────────────────────────────
function InstagramTab() {
  const [items, setItems] = useState<AdminInstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const EMPTY = {
    account_name: "",
    post_url: "",
    image_url: null as string | null,
    caption: "",
    posted_at: new Date().toISOString().slice(0, 16),
  };
  const [form, setForm] = useState(EMPTY);
  const [thumbLoading, setThumbLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminFetchInstagram()); } catch (e) { setErr(String(e)); }
    setLoading(false);
  }, []);

  async function fetchThumb() {
    if (!form.post_url) { setErr("게시물 URL을 먼저 입력하세요"); return; }
    setThumbLoading(true); setErr("");
    try {
      const res = await fetch(`/api/instagram/thumb?url=${encodeURIComponent(form.post_url)}`);
      const data = await res.json() as { thumbnail?: string; error?: string; warning?: string };
      if (data.thumbnail) {
        setForm(f => ({ ...f, image_url: data.thumbnail! }));
        if (data.warning) setErr(`⚠️ ${data.warning}`);
      } else {
        setErr(data.error ?? "썸네일 가져오기 실패");
      }
    } catch (e) { setErr(String(e)); }
    setThumbLoading(false);
  }
  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.account_name.trim() || !form.post_url.trim()) { setErr("계정명과 게시물 URL은 필수입니다"); return; }
    setSaving(true); setErr("");
    try {
      await adminCreateInstagram({
        ...form,
        posted_at: new Date(form.posted_at).toISOString(),
      });
      setShowForm(false); setForm(EMPTY); await load();
    } catch (e) { setErr(String(e)); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    try { await adminDeleteInstagram(id); await load(); } catch (e) { setErr(String(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[#8B95A1]">등록된 게시물 {items.length}건</p>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
            <RefreshCw size={14} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-[13px] font-bold"
            style={{ background: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)" }}>
            <Plus size={14} /> 게시물 추가
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E5E8EB] p-5 mb-5 space-y-4">
          <p className="text-[14px] font-bold text-[#191F28]">인스타그램 게시물 추가</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>계정명 *</label>
              <input className={INPUT} value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="@geumdan_food" />
            </div>
            <div>
              <label className={labelCls}>날짜</label>
              <input className={INPUT} type="datetime-local" value={form.posted_at} onChange={e => setForm(f => ({ ...f, posted_at: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>게시물 URL *</label>
            <div className="flex gap-2">
              <input className={INPUT + " flex-1"} type="url" value={form.post_url} onChange={e => setForm(f => ({ ...f, post_url: e.target.value }))} placeholder="https://www.instagram.com/p/..." />
              <button type="button" onClick={fetchThumb} disabled={thumbLoading || !form.post_url}
                className="shrink-0 px-3 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-40 transition-all"
                style={{ background: "linear-gradient(135deg, #F58529, #DD2A7B)" }}>
                {thumbLoading ? "⏳" : "🔗 썸네일"}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>캡션</label>
            <textarea className={INPUT + " resize-none h-20"} value={form.caption ?? ""} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="#검단맛집 이번 주 핫플..." />
          </div>
          <div>
            <label className={labelCls}>이미지 {form.image_url ? "✅" : "(URL에서 자동 가져오기 또는 직접 업로드)"}</label>
            <ImageUpload value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} folder="instagram" />
          </div>
          {err && <p className="text-[12px] text-[#F04452]">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setErr(""); }}
              className="px-4 py-2 rounded-xl border border-[#E5E8EB] text-[13px] text-[#4E5968] hover:bg-[#F2F4F6]">취소</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #F58529, #DD2A7B)" }}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square bg-white rounded-2xl animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-[#8B95A1] text-[14px]">등록된 게시물이 없습니다</div>
        ) : items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
            <div className="relative aspect-square bg-[#F2F4F6]">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={28} className="text-[#d2d2d7]" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-[12px] font-bold text-[#DD2A7B]">{item.account_name}</p>
              <p className="text-[11px] text-[#4E5968] mt-0.5 line-clamp-2">{item.caption}</p>
              <p className="text-[10px] text-[#8B95A1] mt-1">{formatDate(item.posted_at)}</p>
              <div className="flex gap-1 mt-2">
                <a href={item.post_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#F2F4F6] text-[11px] font-semibold text-[#4E5968]">
                  <ExternalLink size={11} /> 보기
                </a>
                <button onClick={() => handleDelete(item.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-[11px] font-semibold text-[#F04452]">
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "news",      label: "뉴스",       icon: <Newspaper size={16} />,   color: "#3182F6" },
  { id: "youtube",   label: "유튜브",     icon: <PlayCircle size={16} />,  color: "#FF0000" },
  { id: "instagram", label: "인스타그램", icon: <Camera size={16} />,      color: "#DD2A7B" },
];

export default function AdminNewsPage() {
  const [tab, setTab] = useState<Tab>("news");
  const active = TABS.find(t => t.id === tab)!;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5">
        <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">소식 관리</h1>
        <p className="text-[13px] text-[#8B95A1] mt-0.5">뉴스 · 유튜브 · 인스타그램 게시물 수기 등록 및 삭제</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-bold transition-all shrink-0 border ${
              tab === t.id ? "text-white border-transparent" : "bg-white text-[#8B95A1] border-[#E5E8EB]"
            }`}
            style={tab === t.id ? { backgroundColor: t.color, borderColor: t.color } : {}}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "news"      && <NewsTab />}
      {tab === "youtube"   && <YouTubeTab />}
      {tab === "instagram" && <InstagramTab />}
    </div>
  );
}
