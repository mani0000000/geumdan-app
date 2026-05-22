"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, RefreshCw, Camera, ExternalLink, Play,
  X, Pencil, Save, Hash, Settings2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
import { adminSaveSiteSetting, fetchSiteSetting } from "@/lib/db/site-settings";

// ── 타입 ───────────────────────────────────────────────────────
interface InstaPost {
  id: string;
  account_name: string;
  post_url: string;
  image_url: string;
  caption: string;
  posted_at: string;
  is_reel?: boolean;
  is_manual?: boolean;
  media_type?: string;
}

// ── 헬퍼 ───────────────────────────────────────────────────────
function isReel(p: InstaPost) {
  return !!(p.is_reel || p.post_url.includes("/reel/"));
}
function getShortcode(url: string) {
  return url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/)?.[2] ?? null;
}
function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  } catch { return ""; }
}

const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const DEFAULT_KEYWORDS = [
  "검단신도시", "검단", "인천검단", "검단라이프",
  "검단맛집", "검단카페", "검단동", "검단원당",
  "검단아파트", "인천서구맛집",
];
const KEYWORD_KEY = "instagram_keywords";
const MODE_KEY = "instagram_mode"; // "auto" | "manual" | "both"

// ── 편집 모달 ──────────────────────────────────────────────────
function EditModal({
  post,
  onSave,
  onClose,
}: {
  post: InstaPost;
  onSave: () => void;
  onClose: () => void;
}) {
  const [accountName, setAccountName] = useState(post.account_name);
  const [caption, setCaption] = useState(post.caption);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await adminApiPost("instagram_posts", "PATCH", { account_name: accountName, caption }, {
        eq: `id=eq.${post.id}`,
      });
      onSave();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-[15px] font-bold">게시물 수정</h2>
          <button onClick={onClose}><X size={18} className="text-[#8B95A1]" /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">계정명</label>
            <input className={INPUT} value={accountName} onChange={e => setAccountName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">캡션</label>
            <textarea className={INPUT + " resize-none"} rows={3} value={caption}
              onChange={e => setCaption(e.target.value)} />
          </div>
          {err && <p className="text-[#F04452] text-[12px]">{err}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] border border-[#E5E8EB] text-[#4E5968]">취소</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-[13px] font-bold bg-[#3182F6] text-white disabled:opacity-50">
              <span className="flex items-center gap-1.5"><Save size={13} />{saving ? "저장 중..." : "저장"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 게시물 카드 ────────────────────────────────────────────────
function PostCard({
  post: p,
  onEdit,
  onDelete,
}: {
  post: InstaPost;
  onEdit: (p: InstaPost) => void;
  onDelete: (id: string) => void;
}) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const reel = isReel(p);
  const sc = getShortcode(p.post_url);
  const embedSrc = sc ? (reel ? `https://www.instagram.com/reel/${sc}/embed/` : `https://www.instagram.com/p/${sc}/embed/`) : null;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
      <div className="p-4 flex gap-3 items-start">
        {/* 썸네일 */}
        <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden">
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${reel ? "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]" : "bg-[#F2F4F6]"}`}>
              {reel ? <Play size={18} className="text-white fill-white" /> : <Camera size={18} className="text-[#B0B8C1]" />}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <p className="text-[13px] font-bold text-[#191F28]">@{p.account_name || "—"}</p>
            {reel && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFF0F8] border border-[#F9C0D9] text-[10px] font-bold text-[#E1306C]">
                <Play size={7} className="fill-[#E1306C]" /> 릴스
              </span>
            )}
            {p.is_manual ? (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F0FDF4] border border-[#6EE7B7] text-[10px] font-bold text-[#059669]">수동</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F0F9FF] border border-[#BAE6FD] text-[10px] font-bold text-[#0369A1]">자동</span>
            )}
          </div>
          <p className="text-[12px] text-[#4E5968] line-clamp-2">{p.caption || "—"}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-[#B0B8C1]">{formatDate(p.posted_at)}</span>
            <a href={p.post_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-[11px] text-[#3182F6] hover:underline">
              <ExternalLink size={9} /> 원본
            </a>
            {embedSrc && (
              <button onClick={() => setEmbedOpen(v => !v)}
                className="inline-flex items-center gap-0.5 text-[11px] text-[#8B95A1] hover:text-[#191F28]">
                {embedOpen ? <><X size={9} /> 닫기</> : <><Play size={9} /> 미리보기</>}
              </button>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => onEdit(p)} className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(p.id)} className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {embedOpen && embedSrc && (
        <div className="px-4 pb-4">
          <iframe src={embedSrc} className="w-full rounded-xl border border-[#E5E8EB]"
            style={{ height: 420 }} allowFullScreen scrolling="no" loading="lazy" />
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function AdminInstagramPage() {
  const [posts, setPosts]         = useState<InstaPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editPost, setEditPost]   = useState<InstaPost | null>(null);

  // 추가 폼
  const [url, setUrl]             = useState("");
  const [accountName, setAccount] = useState("");
  const [caption, setCaption]     = useState("");
  const [fetching, setFetching]   = useState(false);
  const [preview, setPreview]     = useState<{ thumbnail_url?: string; author_name?: string; title?: string } | null>(null);
  const [fetchErr, setFetchErr]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState("");

  // 키워드 설정
  const [keywords, setKeywords]   = useState<string[]>(DEFAULT_KEYWORDS);
  const [newKw, setNewKw]         = useState("");
  const [kwSaving, setKwSaving]   = useState(false);
  const [kwSaved, setKwSaved]     = useState(false);

  // 모드 설정
  const [mode, setMode]           = useState<"auto" | "manual" | "both">("both");
  const [modeSaving, setModeSaving] = useState(false);

  // 탭
  const [tab, setTab]             = useState<"list" | "add" | "settings">("list");

  // ── 데이터 로드 ────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, kwRaw, modeRaw] = await Promise.all([
        adminApiGet<InstaPost>("instagram_posts", { order: "posted_at", limit: 100 }),
        fetchSiteSetting(KEYWORD_KEY),
        fetchSiteSetting(MODE_KEY),
      ]);
      setPosts(data);
      if (kwRaw) {
        try { setKeywords(JSON.parse(kwRaw)); } catch { /* keep default */ }
      }
      if (modeRaw === "auto" || modeRaw === "manual" || modeRaw === "both") {
        setMode(modeRaw);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── oEmbed 가져오기 ────────────────────────────────────────
  async function fetchOembed() {
    if (!url.trim()) return;
    setFetching(true); setFetchErr(""); setPreview(null);
    try {
      const res = await fetch("/api/admin/instagram-oembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json() as { thumbnail_url?: string; author_name?: string; title?: string; error?: string };
      if (!res.ok) { setFetchErr(data.error ?? "가져오기 실패"); return; }
      setPreview(data);
      if (data.author_name && !accountName) setAccount(data.author_name);
      if (data.title && !caption) setCaption(data.title);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "네트워크 오류");
    } finally { setFetching(false); }
  }

  // ── 수동 저장 ──────────────────────────────────────────────
  async function handleSave() {
    if (!url.trim()) { setSaveErr("URL을 입력하세요."); return; }
    setSaving(true); setSaveErr("");
    try {
      const trimmed = url.trim();
      const reel = trimmed.includes("/reel/");
      await adminApiPost("instagram_posts", "POST", [{
        id: crypto.randomUUID(),
        account_name: accountName || preview?.author_name || "Instagram",
        post_url: trimmed,
        image_url: preview?.thumbnail_url ?? "",
        caption: caption || preview?.title || "",
        posted_at: new Date().toISOString(),
        is_reel: reel,
        is_manual: true,
        media_type: reel ? "REEL" : "IMAGE",
      }]);
      setUrl(""); setAccount(""); setCaption(""); setPreview(null);
      setTab("list");
      await load();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  }

  // ── 삭제 ──────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    await adminApiPost("instagram_posts", "DELETE", null, { eq: `id=eq.${id}` });
    load();
  }

  // ── 키워드 저장 ────────────────────────────────────────────
  async function saveKeywords() {
    setKwSaving(true);
    try {
      await adminSaveSiteSetting(KEYWORD_KEY, JSON.stringify(keywords));
      setKwSaved(true);
      setTimeout(() => setKwSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setKwSaving(false); }
  }

  // ── 모드 저장 ─────────────────────────────────────────────
  async function saveMode(m: typeof mode) {
    setModeSaving(true);
    setMode(m);
    try { await adminSaveSiteSetting(MODE_KEY, m); }
    catch { /* ignore */ }
    finally { setModeSaving(false); }
  }

  const manualCount = posts.filter(p => p.is_manual).length;
  const autoCount   = posts.length - manualCount;

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-[#E1306C]" />
          <div>
            <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">인스타그램 관리</h1>
            <p className="text-[13px] text-[#8B95A1] mt-0.5">
              전체 {posts.length}개 · 수동 {manualCount}개 · 자동 {autoCount}개
            </p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
          <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 p-1 bg-[#F2F4F6] rounded-2xl mb-5">
        {(["list", "add", "settings"] as const).map(t => {
          const labels = { list: "게시물 목록", add: "게시물 추가", settings: "설정" };
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                tab === t ? "bg-white shadow text-[#191F28]" : "text-[#8B95A1] hover:text-[#4E5968]"
              }`}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* ── 목록 탭 ─────────────────────────────────────── */}
      {tab === "list" && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
          ) : posts.length === 0 ? (
            <div className="py-8 text-center text-[#B0B8C1] text-[13px]">저장된 게시물 없음</div>
          ) : posts.map(p => (
            <PostCard key={p.id} post={p} onEdit={setEditPost} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* ── 추가 탭 ─────────────────────────────────────── */}
      {tab === "add" && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 space-y-4">
          <p className="text-[14px] font-bold text-[#191F28]">수동 게시물 추가</p>

          <div>
            <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">인스타그램 게시물 URL *</label>
            <div className="flex gap-2">
              <input className={INPUT} value={url}
                onChange={e => { setUrl(e.target.value); setPreview(null); setFetchErr(""); }}
                placeholder="https://www.instagram.com/p/XXXXXXX/" />
              <button onClick={fetchOembed} disabled={fetching || !url.trim()}
                className="px-4 py-2 rounded-xl text-[13px] font-bold bg-[#3182F6] text-white disabled:opacity-50 whitespace-nowrap">
                {fetching ? "로딩..." : "미리보기"}
              </button>
            </div>
            {fetchErr && <p className="text-[#F04452] text-[12px] mt-1">{fetchErr}</p>}
          </div>

          {preview && (
            <div className="flex gap-3 p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E8EB]">
              {preview.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.thumbnail_url} alt="" className="w-20 h-20 object-cover rounded-xl shrink-0" />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] rounded-xl shrink-0 flex items-center justify-center">
                  <Play size={24} className="text-white fill-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#191F28]">@{preview.author_name}</p>
                <p className="text-[12px] text-[#4E5968] mt-0.5 line-clamp-3">{preview.title}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">계정명</label>
              <input className={INPUT} value={accountName} onChange={e => setAccount(e.target.value)} placeholder="자동 입력됨" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">캡션 (선택)</label>
              <input className={INPUT} value={caption} onChange={e => setCaption(e.target.value)} placeholder="자동 입력됨" />
            </div>
          </div>

          {saveErr && <p className="text-[#F04452] text-[12px]">{saveErr}</p>}

          <button onClick={handleSave} disabled={saving || !url.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
            <Plus size={14} /> {saving ? "저장 중..." : "게시물 저장"}
          </button>
        </div>
      )}

      {/* ── 설정 탭 ─────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="space-y-4">
          {/* 모드 설정 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 size={16} className="text-[#3182F6]" />
              <p className="text-[14px] font-bold text-[#191F28]">수집 모드</p>
              {modeSaving && <RefreshCw size={12} className="animate-spin text-[#8B95A1] ml-auto" />}
            </div>
            <div className="space-y-2">
              {(["both", "auto", "manual"] as const).map(m => {
                const labels = { both: "자동 + 수동", auto: "자동 수집만", manual: "수동 등록만" };
                const descs = {
                  both: "GitHub Actions 자동 수집 + 관리자 수동 등록 모두 표시",
                  auto: "GitHub Actions가 수집한 게시물만 위젯에 표시",
                  manual: "관리자가 직접 등록한 게시물만 위젯에 표시",
                };
                return (
                  <button key={m} onClick={() => saveMode(m)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      mode === m ? "border-[#3182F6] bg-[#EFF6FF]" : "border-[#E5E8EB] hover:border-[#B0C4DE]"
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      mode === m ? "border-[#3182F6]" : "border-[#D1D6DB]"
                    }`}>
                      {mode === m && <div className="w-2 h-2 rounded-full bg-[#3182F6]" />}
                    </div>
                    <div>
                      <p className={`text-[13px] font-bold ${mode === m ? "text-[#1D4ED8]" : "text-[#191F28]"}`}>
                        {labels[m]}
                      </p>
                      <p className="text-[11px] text-[#8B95A1] mt-0.5">{descs[m]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 키워드 설정 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
            <div className="flex items-center gap-2 mb-1">
              <Hash size={16} className="text-[#3182F6]" />
              <p className="text-[14px] font-bold text-[#191F28]">자동 수집 키워드</p>
            </div>
            <p className="text-[12px] text-[#8B95A1] mb-4">
              GitHub Actions가 이 키워드를 해시태그로 검색해 게시물을 자동 수집합니다.
            </p>

            {/* 키워드 태그 목록 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {keywords.map(kw => (
                <div key={kw} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 bg-[#F2F4F6] rounded-full">
                  <span className="text-[12px] font-semibold text-[#4E5968]">#{kw}</span>
                  <button onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}
                    className="w-4 h-4 rounded-full bg-[#8B95A1] hover:bg-[#F04452] flex items-center justify-center text-white transition-colors">
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>

            {/* 키워드 추가 */}
            <div className="flex gap-2 mb-4">
              <input
                className={INPUT}
                value={newKw}
                onChange={e => setNewKw(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newKw.trim()) {
                    const kw = newKw.trim().replace(/^#/, "");
                    if (!keywords.includes(kw)) setKeywords(prev => [...prev, kw]);
                    setNewKw("");
                  }
                }}
                placeholder="키워드 입력 후 Enter"
              />
              <button
                onClick={() => {
                  const kw = newKw.trim().replace(/^#/, "");
                  if (kw && !keywords.includes(kw)) {
                    setKeywords(prev => [...prev, kw]);
                    setNewKw("");
                  }
                }}
                disabled={!newKw.trim()}
                className="px-3 py-2 rounded-xl text-[13px] font-bold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] disabled:opacity-40"
              >
                추가
              </button>
            </div>

            <button onClick={saveKeywords} disabled={kwSaving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-50 ${
                kwSaved ? "bg-[#00C471] text-white" : "bg-[#3182F6] text-white hover:bg-[#2563EB]"
              }`}>
              {kwSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              {kwSaved ? "저장됨 ✓" : "키워드 저장"}
            </button>
          </div>

          {/* 자동 수집 현황 */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4">
            <p className="text-[13px] font-bold text-[#1D4ED8] flex items-center gap-2 mb-1">
              {mode === "manual" ? (
                <><ToggleLeft size={15} /> 자동 수집 비활성화됨</>
              ) : (
                <><ToggleRight size={15} /> 자동 수집 활성화됨</>
              )}
            </p>
            <p className="text-[12px] text-[#1E40AF]">
              GitHub Actions가 매시간 위 키워드로 게시물을 자동 수집합니다.
              수동 등록한 게시물은 <strong>수동</strong> 뱃지로 표시됩니다.
            </p>
          </div>
        </div>
      )}

      {/* 편집 모달 */}
      {editPost && (
        <EditModal
          post={editPost}
          onSave={load}
          onClose={() => setEditPost(null)}
        />
      )}
    </div>
  );
}
