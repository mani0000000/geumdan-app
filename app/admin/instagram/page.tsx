"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, AtSign, Camera, CheckCircle2, Clock3, ExternalLink, Hash,
  Image as ImageIcon, Plus, RefreshCw, Save, Sparkles, Trash2, Users,
} from "lucide-react";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
import { adminSaveSiteSetting, fetchSiteSetting } from "@/lib/db/site-settings";

type Tab = "content" | "accounts" | "keywords" | "manual";
type Category = "맛집" | "가볼만한 곳" | "지역소식" | "생활정보" | "육아·교육";

interface SocialPost {
  id: string;
  account_name: string;
  username?: string;
  post_url: string;
  image_url?: string;
  caption?: string;
  posted_at: string;
  content_type?: string;
  media_type?: string;
  category?: string;
  is_reel?: boolean;
  is_story?: boolean;
  is_manual?: boolean;
}

interface SocialSource {
  id: string;
  username: string;
  display_name?: string;
  profile_image_url?: string;
  category: Category;
  follower_count: number;
  active: boolean;
  featured: boolean;
  collect_posts: boolean;
  collect_reels: boolean;
  collect_stories: boolean;
  priority: number;
  discovered_by?: string;
  last_collected_at?: string;
  last_status?: string;
  last_error?: string;
}

interface SocialKeyword {
  id: string;
  keyword: string;
  category: Category;
  active: boolean;
  collect_hashtag: boolean;
  priority: number;
}

interface BatchStatus {
  keywords?: number;
  sources?: number;
  posts?: number;
  reels?: number;
  stories?: number;
  errors?: number;
  durationSeconds?: number;
  api?: string;
}

const CATEGORIES: Category[] = ["맛집", "가볼만한 곳", "지역소식", "생활정보", "육아·교육"];
const INPUT = "w-full rounded-xl border border-[#e5e8eb] bg-white px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[#3182f6] focus:ring-2 focus:ring-[#3182f6]/10";

function dateTime(value?: string) {
  if (!value) return "수집 전";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function compactNumber(value = 0) {
  return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b7684]">
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[#3182f6]" : "bg-[#d1d6db]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

function CollectionStatus({ at, status, batch }: { at?: string; status?: string; batch: BatchStatus | null }) {
  const healthy = !batch?.errors;
  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-[#e5e8eb] bg-white">
      <div className="flex items-start gap-3 px-4 py-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${healthy ? "bg-[#e8f8f0] text-[#00a86b]" : "bg-[#fff3e8] text-[#ed7b2f]"}`}>
          {healthy ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-extrabold text-[#191f28]">정기 수집 {healthy ? "정상" : "확인 필요"}</p>
            <span className="text-[10px] font-semibold text-[#8b95a1]">{dateTime(at)}</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[#6b7684]">
            매시간 최신 게시물·릴스·스토리를 확인합니다. 스토리는 24시간 만료 전에 보여요.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 border-t border-[#edf0f2] bg-[#fafbfc]">
        {[["포스트", batch?.posts], ["릴스", batch?.reels], ["스토리", batch?.stories], ["오류", batch?.errors]].map(([label, value]) => (
          <div key={String(label)} className="py-3 text-center">
            <p className="text-[15px] font-black text-[#191f28]">{value ?? "-"}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8b95a1]">{label}</p>
          </div>
        ))}
      </div>
      {status && <p className="border-t border-[#edf0f2] px-4 py-2 text-[10px] text-[#8b95a1]">상태 원문 · {status}</p>}
    </div>
  );
}

export default function AdminInstagramPage() {
  const [tab, setTab] = useState<Tab>("content");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [sources, setSources] = useState<SocialSource[]>([]);
  const [keywords, setKeywords] = useState<SocialKeyword[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [lastCollectedAt, setLastCollectedAt] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sourceStorage, setSourceStorage] = useState<"table" | "settings">("table");
  const [keywordStorage, setKeywordStorage] = useState<"table" | "settings">("table");

  const [accountUsername, setAccountUsername] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountCategory, setAccountCategory] = useState<Category>("지역소식");
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordCategory, setKeywordCategory] = useState<Category>("지역소식");

  const [manualUrl, setManualUrl] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [manualAccount, setManualAccount] = useState("");
  const [manualCategory, setManualCategory] = useState<Category>("지역소식");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [postRows, at, status] = await Promise.all([
        adminApiGet<SocialPost>("instagram_posts", { order: "posted_at.desc", limit: 120 }),
        fetchSiteSetting("instagram_last_collected_at"),
        fetchSiteSetting("instagram_last_status"),
      ]);
      setPosts(postRows);
      try {
        const sourceRows = await adminApiGet<SocialSource>("social_content_sources", { order: "priority.desc", limit: 300 });
        setSources(sourceRows);
        setSourceStorage("table");
      } catch {
        const raw = await fetchSiteSetting("instagram_managed_sources");
        setSources(raw ? JSON.parse(raw) : []);
        setSourceStorage("settings");
      }
      try {
        const keywordRows = await adminApiGet<SocialKeyword>("social_content_keywords", { order: "priority.desc", limit: 300 });
        setKeywords(keywordRows);
        setKeywordStorage("table");
      } catch {
        const raw = await fetchSiteSetting("instagram_keywords_config");
        const legacy = raw || await fetchSiteSetting("instagram_keywords");
        const parsed = legacy ? JSON.parse(legacy) : [];
        setKeywords(parsed.map((item: SocialKeyword | string, index: number) => typeof item === "string" ? {
          id: `settings-${item}`, keyword: item, category: "지역소식", active: true, collect_hashtag: true, priority: 100 - index,
        } : item));
        setKeywordStorage("settings");
      }
      setLastCollectedAt(at ?? undefined);
      if (status) {
        try { setBatchStatus(JSON.parse(status)); } catch { setBatchStatus(null); }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const candidates = useMemo(() => sources.filter(source => !source.active).length, [sources]);

  async function saveSourcesToSettings(next: SocialSource[]) {
    setSources(next);
    await adminSaveSiteSetting("instagram_managed_sources", JSON.stringify(next));
  }

  async function saveKeywordsToSettings(next: SocialKeyword[]) {
    setKeywords(next);
    await adminSaveSiteSetting("instagram_keywords_config", JSON.stringify(next));
  }

  async function addAccount() {
    const username = accountUsername.trim().replace(/^@/, "").toLowerCase();
    if (!username) return;
    try {
      const row: SocialSource & { platform: string; profile_url: string } = {
        id: `settings-${username}`,
        platform: "instagram",
        username,
        display_name: accountName.trim() || username,
        profile_url: `https://www.instagram.com/${username}/`,
        category: accountCategory,
        follower_count: 0,
        active: true,
        featured: false,
        collect_posts: true,
        collect_reels: true,
        collect_stories: true,
        priority: 50,
        discovered_by: "관리자 등록",
        last_status: "다음 수집 대기",
      };
      if (sourceStorage === "table") {
        const { id: _id, ...tableRow } = row;
        await adminApiPost("social_content_sources", "POST", [tableRow], { onConflict: "platform,username" });
      } else {
        await saveSourcesToSettings([...sources.filter(source => source.username !== username), row]);
      }
      setAccountUsername(""); setAccountName("");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "계정 저장 실패"); }
  }

  async function patchSource(source: SocialSource, patch: Partial<SocialSource>) {
    setSources(current => current.map(item => item.id === source.id ? { ...item, ...patch } : item));
    try {
      if (sourceStorage === "table") {
        await adminApiPost("social_content_sources", "PATCH", patch, { eq: `id=eq.${source.id}` });
      } else {
        await saveSourcesToSettings(sources.map(item => item.id === source.id ? { ...item, ...patch } : item));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계정 설정 저장 실패");
      await load();
    }
  }

  async function addKeyword() {
    const keyword = newKeyword.trim().replace(/^#/, "");
    if (!keyword) return;
    try {
      const row: SocialKeyword = {
        id: `settings-${keyword}`, keyword, category: keywordCategory, active: true, collect_hashtag: true, priority: 50,
      };
      if (keywordStorage === "table") {
        const { id: _id, ...tableRow } = row;
        await adminApiPost("social_content_keywords", "POST", [tableRow], { onConflict: "keyword" });
      } else {
        await saveKeywordsToSettings([...keywords.filter(item => item.keyword !== keyword), row]);
      }
      setNewKeyword("");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "키워드 저장 실패"); }
  }

  async function deleteRow(table: "instagram_posts" | "social_content_sources" | "social_content_keywords", id: string) {
    if (!window.confirm("삭제할까요?")) return;
    if (table === "social_content_sources" && sourceStorage === "settings") {
      await saveSourcesToSettings(sources.filter(item => item.id !== id));
    } else if (table === "social_content_keywords" && keywordStorage === "settings") {
      await saveKeywordsToSettings(keywords.filter(item => item.id !== id));
    } else {
      await adminApiPost(table, "DELETE", null, { eq: `id=eq.${id}` });
    }
    await load();
  }

  async function toggleKeyword(keyword: SocialKeyword, active: boolean) {
    if (keywordStorage === "table") {
      await adminApiPost("social_content_keywords", "PATCH", { active }, { eq: `id=eq.${keyword.id}` });
      await load();
    } else {
      await saveKeywordsToSettings(keywords.map(item => item.id === keyword.id ? { ...item, active } : item));
    }
  }

  async function addManualPost() {
    if (!manualUrl.trim()) return;
    const reel = manualUrl.includes("/reel/");
    try {
      await adminApiPost("instagram_posts", "POST", [{
        account_name: manualAccount.trim() || "검단 로컬 크리에이터",
        username: manualAccount.trim().replace(/^@/, "").toLowerCase() || null,
        post_url: manualUrl.trim(), image_url: manualImage.trim(), caption: manualCaption.trim(),
        posted_at: new Date().toISOString(), collected_at: new Date().toISOString(),
        is_reel: reel, is_story: false, is_manual: true, active: true,
        media_type: reel ? "REEL" : "POST", content_type: reel ? "REEL" : "POST",
        category: manualCategory, relevance_score: 100,
      }]);
      setManualUrl(""); setManualImage(""); setManualCaption(""); setManualAccount("");
      setTab("content"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "게시물 저장 실패"); }
  }

  const tabs: { id: Tab; label: string; icon: typeof Camera; count?: number }[] = [
    { id: "content", label: "콘텐츠", icon: Camera, count: posts.length },
    { id: "accounts", label: "계정", icon: Users, count: sources.length },
    { id: "keywords", label: "키워드", icon: Hash, count: keywords.length },
    { id: "manual", label: "직접 추가", icon: Plus },
  ];

  return (
    <main className="max-w-5xl p-4 md:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f5a14d,#df3e78,#7149b7)] text-white"><Sparkles size={18} /></span>
            <div>
              <h1 className="text-[19px] font-black tracking-[-0.02em] text-[#191f28]">검단 로컬 SNS 관리</h1>
              <p className="mt-0.5 text-[11px] font-medium text-[#8b95a1]">계정·키워드·수집 상태를 한 곳에서 관리합니다</p>
            </div>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex h-9 items-center gap-1.5 rounded-xl border border-[#e5e8eb] px-3 text-[11px] font-bold text-[#6b7684]">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> 새로고침
        </button>
      </div>

      <CollectionStatus at={lastCollectedAt} batch={batchStatus} />
      {message && <div className="mb-4 rounded-xl bg-[#fff3e8] px-4 py-3 text-[12px] font-semibold text-[#a94f15]">{message}</div>}

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-[#f2f4f6] p-1 [scrollbar-width:none]">
        {tabs.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex min-w-[100px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-extrabold transition ${tab === item.id ? "bg-white text-[#191f28] shadow-sm" : "text-[#8b95a1]"}`}>
              <Icon size={13} /> {item.label}{item.count != null && <span className="text-[9px] text-[#8b95a1]">{item.count}</span>}
            </button>
          );
        })}
      </div>

      {tab === "content" && (
        <div className="grid gap-3 md:grid-cols-2">
          {posts.map(post => (
            <article key={post.id} className="flex gap-3 rounded-2xl border border-[#e5e8eb] bg-white p-3.5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[linear-gradient(145deg,#3b1d52,#cf4776,#ed8b4d)]">
                {post.image_url ? <img src={post.image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <ImageIcon className="absolute inset-0 m-auto text-white/75" size={22} />}
                <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[8px] font-black text-white">{post.content_type || post.media_type || "POST"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[12px] font-extrabold text-[#191f28]">@{post.username || post.account_name}</p>
                  <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[9px] font-bold text-[#6b7684]">{post.category || "지역소식"}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6b7684]">{post.caption || "캡션 없음"}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-[#8b95a1]">
                  <Clock3 size={10} /> {dateTime(post.posted_at)}
                  <a href={post.post_url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-[#3182f6]"><ExternalLink size={10} /> 원문</a>
                  <button onClick={() => deleteRow("instagram_posts", post.id)} className="text-[#f04452]"><Trash2 size={12} /></button>
                </div>
              </div>
            </article>
          ))}
          {!loading && posts.length === 0 && <p className="py-12 text-center text-[12px] text-[#8b95a1] md:col-span-2">수집된 콘텐츠가 없습니다.</p>}
        </div>
      )}

      {tab === "accounts" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#e5e8eb] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div><p className="text-[14px] font-extrabold text-[#191f28]">수집 계정 추가</p><p className="mt-0.5 text-[11px] text-[#8b95a1]">공개 Instagram 계정명을 입력하세요.</p></div>
              {candidates > 0 && <span className="rounded-full bg-[#fff3e8] px-2.5 py-1 text-[10px] font-bold text-[#b75d1e]">검토 후보 {candidates}</span>}
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_150px_auto]">
              <div className="relative"><AtSign size={14} className="absolute left-3 top-3 text-[#8b95a1]" /><input className={`${INPUT} pl-8`} value={accountUsername} onChange={event => setAccountUsername(event.target.value)} placeholder="계정명" /></div>
              <input className={INPUT} value={accountName} onChange={event => setAccountName(event.target.value)} placeholder="표시 이름 (선택)" />
              <select className={INPUT} value={accountCategory} onChange={event => setAccountCategory(event.target.value as Category)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select>
              <button onClick={addAccount} disabled={!accountUsername.trim()} className="rounded-xl bg-[#191f28] px-4 py-2.5 text-[12px] font-extrabold text-white disabled:opacity-40">계정 추가</button>
            </div>
          </section>

          {sources.map(source => (
            <section key={source.id} className={`rounded-2xl border bg-white p-4 ${source.active ? "border-[#e5e8eb]" : "border-dashed border-[#f0b37e]"}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f2f4f6] text-[13px] font-black text-[#6b7684]">
                  {source.profile_image_url ? <img src={source.profile_image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : source.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-extrabold text-[#191f28]">{source.display_name || source.username}</p>
                    <span className="text-[11px] text-[#8b95a1]">@{source.username}</span>
                    {source.featured && <span className="rounded-full bg-[#f0eaff] px-2 py-0.5 text-[9px] font-black text-[#7045bd]">추천</span>}
                  </div>
                  <p className="mt-1 text-[10px] text-[#8b95a1]">{source.category} · 팔로워 {compactNumber(source.follower_count)} · {source.discovered_by || "직접 등록"}</p>
                  <p className={`mt-1 text-[10px] font-semibold ${source.last_error ? "text-[#f04452]" : "text-[#00a86b]"}`}>{source.last_status || "다음 수집 대기"} · {dateTime(source.last_collected_at)}</p>
                </div>
                <button onClick={() => deleteRow("social_content_sources", source.id)} className="p-2 text-[#b0b8c1] hover:text-[#f04452]"><Trash2 size={14} /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#edf0f2] pt-3">
                <Toggle checked={source.active} label={source.active ? "수집 중" : "수집 꺼짐"} onChange={active => patchSource(source, { active })} />
                <Toggle checked={source.featured} label="홈 추천" onChange={featured => patchSource(source, { featured })} />
                <Toggle checked={source.collect_posts} label="게시물" onChange={collect_posts => patchSource(source, { collect_posts })} />
                <Toggle checked={source.collect_reels} label="릴스" onChange={collect_reels => patchSource(source, { collect_reels })} />
                <Toggle checked={source.collect_stories} label="스토리" onChange={collect_stories => patchSource(source, { collect_stories })} />
                <select value={source.category} onChange={event => patchSource(source, { category: event.target.value as Category })} className="ml-auto rounded-lg border border-[#e5e8eb] px-2 py-1.5 text-[10px] font-bold text-[#6b7684]">{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select>
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "keywords" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#e5e8eb] bg-white p-4">
            <p className="text-[14px] font-extrabold text-[#191f28]">수집 키워드 추가</p>
            <p className="mb-3 mt-0.5 text-[11px] text-[#8b95a1]">해시태그 검색 결과에서 지역 계정 후보도 함께 발견합니다.</p>
            <div className="grid gap-2 md:grid-cols-[1fr_170px_auto]">
              <div className="relative"><Hash size={14} className="absolute left-3 top-3 text-[#8b95a1]" /><input className={`${INPUT} pl-8`} value={newKeyword} onChange={event => setNewKeyword(event.target.value)} placeholder="검단신도시맛집" /></div>
              <select className={INPUT} value={keywordCategory} onChange={event => setKeywordCategory(event.target.value as Category)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select>
              <button onClick={addKeyword} disabled={!newKeyword.trim()} className="rounded-xl bg-[#3182f6] px-4 py-2.5 text-[12px] font-extrabold text-white disabled:opacity-40">키워드 추가</button>
            </div>
          </section>
          <div className="grid gap-2 md:grid-cols-2">
            {keywords.map(keyword => (
              <div key={keyword.id} className="flex items-center gap-3 rounded-2xl border border-[#e5e8eb] bg-white p-3.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${keyword.active ? "bg-[#eaf3ff] text-[#3182f6]" : "bg-[#f2f4f6] text-[#8b95a1]"}`}><Hash size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-extrabold text-[#191f28]">#{keyword.keyword}</p><p className="text-[10px] font-medium text-[#8b95a1]">{keyword.category} · 우선순위 {keyword.priority}</p></div>
                <Toggle checked={keyword.active} label="" onChange={active => void toggleKeyword(keyword, active)} />
                <button onClick={() => deleteRow("social_content_keywords", keyword.id)} className="text-[#b0b8c1] hover:text-[#f04452]"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "manual" && (
        <section className="max-w-2xl rounded-2xl border border-[#e5e8eb] bg-white p-5">
          <div className="mb-4"><p className="text-[14px] font-extrabold text-[#191f28]">콘텐츠 직접 추가</p><p className="mt-0.5 text-[11px] text-[#8b95a1]">자동 수집에서 빠진 중요한 검단 콘텐츠를 직접 등록합니다.</p></div>
          <div className="space-y-3">
            <div><label className="mb-1 block text-[10px] font-bold text-[#8b95a1]">Instagram 원문 URL *</label><input className={INPUT} value={manualUrl} onChange={event => setManualUrl(event.target.value)} placeholder="https://www.instagram.com/reel/..." /></div>
            <div><label className="mb-1 block text-[10px] font-bold text-[#8b95a1]">썸네일 이미지 URL</label><input className={INPUT} value={manualImage} onChange={event => setManualImage(event.target.value)} placeholder="https://..." /></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="mb-1 block text-[10px] font-bold text-[#8b95a1]">계정명</label><input className={INPUT} value={manualAccount} onChange={event => setManualAccount(event.target.value)} placeholder="@username" /></div><div><label className="mb-1 block text-[10px] font-bold text-[#8b95a1]">분류</label><select className={INPUT} value={manualCategory} onChange={event => setManualCategory(event.target.value as Category)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></div></div>
            <div><label className="mb-1 block text-[10px] font-bold text-[#8b95a1]">소개 문구</label><textarea className={`${INPUT} min-h-28 resize-y`} value={manualCaption} onChange={event => setManualCaption(event.target.value)} /></div>
            <button onClick={addManualPost} disabled={!manualUrl.trim()} className="flex items-center gap-1.5 rounded-xl bg-[#3182f6] px-5 py-2.5 text-[12px] font-extrabold text-white disabled:opacity-40"><Save size={14} /> 콘텐츠 저장</button>
          </div>
        </section>
      )}
    </main>
  );
}
