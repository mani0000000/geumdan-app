"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Camera, ExternalLink, AlertCircle } from "lucide-react";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

interface InstaPost {
  id: string;
  account_name: string;
  post_url: string;
  image_url: string;
  caption: string;
  posted_at: string;
}

const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";

export default function AdminInstagramPage() {
  const [posts, setPosts] = useState<InstaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [accountName, setAccountName] = useState("");
  const [caption, setCaption] = useState("");
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<{ thumbnail_url?: string; author_name?: string; title?: string } | null>(null);
  const [fetchErr, setFetchErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [noToken, setNoToken] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApiGet<InstaPost>("instagram_posts", { order: "posted_at", limit: 50 });
      setPosts(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function fetchOembed() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchErr("");
    setPreview(null);
    try {
      const res = await fetch("/api/admin/instagram-oembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json() as { thumbnail_url?: string; author_name?: string; title?: string; error?: string };
      if (!res.ok) {
        if (data.error?.includes("환경변수")) setNoToken(true);
        setFetchErr(data.error ?? "가져오기 실패");
        return;
      }
      setPreview(data);
      if (data.author_name && !accountName) setAccountName(data.author_name);
      if (data.title && !caption) setCaption(data.title);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "네트워크 오류");
    } finally { setFetching(false); }
  }

  async function handleSave() {
    if (!url.trim()) { setSaveErr("URL을 입력하세요."); return; }
    if (!preview?.thumbnail_url && !url.trim()) { setSaveErr("먼저 썸네일을 가져오세요."); return; }
    setSaving(true);
    setSaveErr("");
    try {
      const id = "ig_" + Date.now().toString(36);
      await adminApiPost("instagram_posts", "POST", [{
        id,
        account_name: accountName || preview?.author_name || "Instagram",
        post_url: url.trim(),
        image_url: preview?.thumbnail_url ?? "",
        caption: caption || preview?.title || "",
        posted_at: new Date().toISOString(),
      }], { onConflict: "id" });
      setUrl("");
      setAccountName("");
      setCaption("");
      setPreview(null);
      await load();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    await adminApiPost("instagram_posts", "DELETE", null, { eq: `id=eq.${id}` });
    load();
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-5">
        <Camera size={20} className="text-[#E1306C]" />
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">인스타그램 게시물 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">oEmbed로 썸네일 가져오기 · {posts.length}개</p>
        </div>
        <button onClick={load} className="ml-auto p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
          <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
      </div>

      {/* 환경변수 미설정 안내 */}
      {noToken && (
        <div className="mb-4 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-4 space-y-2">
          <p className="text-[13px] font-bold text-[#92400E] flex items-center gap-2">
            <AlertCircle size={15} /> INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET 미설정
          </p>
          <p className="text-[12px] text-[#92400E]">Vercel 환경변수에 아래 두 값을 추가해야 합니다.</p>
          <ol className="text-[12px] text-[#92400E] list-decimal pl-4 space-y-1">
            <li><a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">developers.facebook.com</a> 에서 앱 생성</li>
            <li>Instagram &gt; Instagram oEmbed 제품 추가</li>
            <li>앱 ID · 앱 시크릿을 Vercel 환경변수에 추가</li>
          </ol>
          <code className="block text-[11px] bg-white rounded-lg p-2 border border-[#FED7AA]">
            INSTAGRAM_APP_ID=123456789{"\n"}INSTAGRAM_APP_SECRET=abcdef...
          </code>
        </div>
      )}

      {/* URL 입력 */}
      <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 mb-5 space-y-3">
        <p className="text-[14px] font-bold text-[#191F28]">게시물 추가</p>

        <div>
          <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">인스타그램 게시물 URL *</label>
          <div className="flex gap-2">
            <input className={INPUT} value={url}
              onChange={e => { setUrl(e.target.value); setPreview(null); setFetchErr(""); }}
              placeholder="https://www.instagram.com/p/XXXXXXX/" />
            <button onClick={fetchOembed} disabled={fetching || !url.trim()}
              className="px-4 py-2 rounded-xl text-[13px] font-bold bg-[#3182F6] text-white disabled:opacity-50 whitespace-nowrap">
              {fetching ? "로딩..." : "썸네일 가져오기"}
            </button>
          </div>
          {fetchErr && <p className="text-[#F04452] text-[12px] mt-1">{fetchErr}</p>}
        </div>

        {/* 미리보기 */}
        {preview && (
          <div className="flex gap-3 p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E8EB]">
            {preview.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.thumbnail_url} alt="" className="w-20 h-20 object-cover rounded-xl shrink-0" />
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
            <input className={INPUT} value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="자동 입력됨" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">캡션 (선택)</label>
            <input className={INPUT} value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="자동 입력됨" />
          </div>
        </div>

        {saveErr && <p className="text-[#F04452] text-[12px]">{saveErr}</p>}

        <button onClick={handleSave} disabled={saving || !url.trim()}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
          <Plus size={14} /> {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* 저장된 게시물 목록 */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center text-[#B0B8C1] text-[13px]">저장된 게시물 없음</div>
        ) : posts.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 flex gap-3 items-start">
            {p.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.image_url} alt="" className="w-16 h-16 object-cover rounded-xl shrink-0" />
              : <div className="w-16 h-16 bg-[#F2F4F6] rounded-xl shrink-0 flex items-center justify-center">
                  <Camera size={20} className="text-[#B0B8C1]" />
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#191F28]">@{p.account_name}</p>
              <p className="text-[12px] text-[#4E5968] mt-0.5 line-clamp-2">{p.caption || "—"}</p>
              <a href={p.post_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#3182F6] hover:underline">
                <ExternalLink size={10} /> 원본 보기
              </a>
            </div>
            <button onClick={() => handleDelete(p.id)}
              className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452] shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
