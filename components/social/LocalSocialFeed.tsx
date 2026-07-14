"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight, ExternalLink, Heart, MessageCircle, Play, RefreshCw,
  Sparkles, Users, X,
} from "lucide-react";
import { fetchInstagramFeeds, type InstagramPost } from "@/lib/api/instagram";
import { formatRelativeTime } from "@/lib/utils";

const CATEGORIES = ["전체", "맛집", "가볼만한 곳", "지역소식", "생활정보"];

function compactNumber(value = 0) {
  return new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function embedUrl(post: InstagramPost) {
  const match = post.permalink.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${post.isReel ? "reel" : "p"}/${match[2]}/embed/`;
}

function contentLabel(post: InstagramPost) {
  if (post.isStory) return "스토리";
  if (post.isReel) return "릴스";
  if (post.contentType === "CAROUSEL") return "여러 장";
  return "포스트";
}

function SocialFallback({ category }: { category?: string }) {
  const text = category === "맛집" ? "검단의 맛있는 발견"
    : category === "가볼만한 곳" ? "오늘 어디로 가볼까요?"
    : "검단의 오늘을 모았어요";
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,#3b1d52_0%,#a83273_50%,#ec7b45_100%)]">
      <div className="absolute -right-8 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-[#ffd08a]/25 blur-2xl" />
      <div className="absolute inset-x-5 bottom-5">
        <Sparkles size={22} className="mb-2 text-white/90" />
        <p className="text-[15px] font-extrabold leading-snug text-white">{text}</p>
      </div>
    </div>
  );
}

function MediaImage({ post, className = "" }: { post: InstagramPost; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!post.thumbnailUrl || failed) return <SocialFallback category={post.category} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={post.thumbnailUrl}
      alt={post.caption || `${post.username ?? "검단"} 콘텐츠`}
      className={`h-full w-full object-cover ${className}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function Avatar({ post, size = "md" }: { post: InstagramPost; size?: "sm" | "md" | "lg" }) {
  const pixel = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = (post.displayName || post.username || "G").slice(0, 1).toUpperCase();
  return (
    <div className={`${pixel} shrink-0 overflow-hidden rounded-full bg-[linear-gradient(135deg,#f7ad55,#df3e78,#6f47b7)] p-[2px]`}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#f2f4f6] text-[11px] font-black text-[#4e5968]">
        {post.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.profileImageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : text}
      </div>
    </div>
  );
}

function SocialViewer({ post, onClose }: { post: InstagramPost; onClose: () => void }) {
  const embed = embedUrl(post);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[350] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <section className="flex max-h-[94dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]" onClick={event => event.stopPropagation()}>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#edf0f2] px-4">
          <Avatar post={post} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-extrabold text-[#191f28]">{post.displayName || `@${post.username}`}</p>
            <p className="text-[11px] font-medium text-[#8b95a1]">{post.category} · {contentLabel(post)}</p>
          </div>
          <a href={post.permalink} target="_blank" rel="noopener noreferrer" aria-label="인스타그램 원문 열기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f4f6] text-[#4e5968]">
            <ExternalLink size={16} />
          </a>
          <button onClick={onClose} aria-label="닫기" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f4f6] text-[#4e5968]">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9]">
          {post.isStory || !embed ? (
            <div className="relative mx-auto aspect-[9/16] max-h-[72dvh] w-full max-w-[420px] overflow-hidden bg-[#191f28]">
              <MediaImage post={post} />
            </div>
          ) : (
            <iframe src={embed} title={`${post.username ?? "검단"} ${contentLabel(post)}`}
              className="mx-auto block min-h-[620px] w-full max-w-[500px] border-0 bg-white" allowFullScreen loading="eager" />
          )}
          {post.caption && (
            <div className="bg-white px-5 py-4">
              <p className="whitespace-pre-line text-[13px] leading-6 text-[#333d4b] line-clamp-6">{post.caption}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StoryRail({ posts, onSelect }: { posts: InstagramPost[]; onSelect: (post: InstagramPost) => void }) {
  if (!posts.length) return null;
  return (
    <div className="mb-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {posts.map(post => (
        <button key={post.id} onClick={() => onSelect(post)} className="w-[66px] shrink-0 text-center active:scale-95">
          <div className="relative mx-auto w-fit">
            <Avatar post={post} size="lg" />
            <span className="absolute -bottom-0.5 -right-1 rounded-full border-2 border-white bg-[#7c3aed] px-1.5 py-0.5 text-[8px] font-black text-white">LIVE</span>
          </div>
          <p className="mt-1.5 truncate text-[10px] font-bold text-[#4e5968]">{post.displayName || post.username}</p>
        </button>
      ))}
    </div>
  );
}

function SocialCard({ post, compact, onSelect }: { post: InstagramPost; compact: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      data-social-card={post.id}
      className={`group shrink-0 overflow-hidden rounded-[22px] bg-white text-left shadow-[0_7px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.055] transition duration-200 active:scale-[0.98] ${compact ? "w-[238px]" : "w-full"}`}>
      <div className={`relative overflow-hidden bg-[#202631] ${compact ? "aspect-[4/3]" : "aspect-[4/5]"}`}>
        <MediaImage post={post} className="transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
        <span className="absolute left-3 top-3 rounded-full bg-black/48 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur-md">
          {post.category || "지역소식"}
        </span>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-[#191f28] backdrop-blur-md">
          {(post.isReel || post.isStory) && <Play size={9} className="fill-current" />}{contentLabel(post)}
        </span>
        {(post.isReel || post.isStory) && (
          <span className="absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/38 text-white backdrop-blur-sm">
            <Play size={18} className="ml-0.5 fill-current" />
          </span>
        )}
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="flex items-center gap-2.5">
          <Avatar post={post} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-extrabold text-[#191f28]">{post.displayName || `@${post.username}`}</p>
            <p className="truncate text-[10px] font-medium text-[#8b95a1]">@{post.username}</p>
          </div>
          {post.followerCount ? <span className="text-[10px] font-bold text-[#6b7684]">팔로워 {compactNumber(post.followerCount)}</span> : null}
        </div>
        <p className={`mt-2.5 font-semibold leading-[1.45] text-[#333d4b] ${compact ? "line-clamp-2 text-[12px]" : "line-clamp-3 text-[13px]"}`}>
          {post.caption || "검단에서 발견한 새로운 이야기를 확인해 보세요."}
        </p>
        <div className="mt-2.5 flex items-center gap-3 text-[10px] font-semibold text-[#8b95a1]">
          <span className="flex items-center gap-1"><Heart size={11} />{compactNumber(post.likeCount)}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} />{compactNumber(post.commentCount)}</span>
          <span className="ml-auto">{formatRelativeTime(post.postedAt)}</span>
        </div>
      </div>
    </button>
  );
}

export default function LocalSocialFeed({
  variant = "home",
  showHeader = true,
  title = "검단 로컬 크리에이터",
}: {
  variant?: "home" | "full" | "strip";
  showHeader?: boolean;
  title?: string;
}) {
  const compact = variant !== "full";
  const [items, setItems] = useState<InstagramPost[]>([]);
  const [category, setCategory] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InstagramPost | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchInstagramFeeds({
      limit: compact ? 16 : 40,
      category,
      sort: "latest",
    });
    setItems(result);
    setLoading(false);
  }, [category, compact]);

  useEffect(() => { void load(); }, [load]);
  const stories = useMemo(() => items.filter(item => item.isStory), [items]);
  const cards = useMemo(() => items.filter(item => !item.isStory), [items]);
  const lastCollected = items.map(item => item.collectedAt).filter(Boolean).sort().at(-1);

  return (
    <section className={compact ? "py-3" : "pb-8 pt-3"}>
      {showHeader && (
        <div className="mb-3 flex items-end justify-between px-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#f5a14d,#dc3973,#7549b8)] text-white">
                <Users size={15} />
              </span>
              <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#191f28]">{title}</h2>
            </div>
            <p className="mt-1 text-[11px] font-medium text-[#8b95a1]">맛집·나들이·동네 소식을 매일 모아 보여드려요</p>
          </div>
          <button onClick={load} disabled={loading} aria-label="새로 불러오기"
            className="flex h-8 items-center gap-1.5 rounded-full bg-[#f2f4f6] px-3 text-[10px] font-bold text-[#6b7684] disabled:opacity-50">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            {lastCollected ? formatRelativeTime(lastCollected) : "업데이트"}
          </button>
        </div>
      )}

      <div className="mb-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map(value => (
          <button key={value} onClick={() => setCategory(value)}
            className={`h-8 shrink-0 rounded-full px-3.5 text-[11px] font-extrabold transition ${category === value ? "bg-[#191f28] text-white" : "bg-[#f2f4f6] text-[#6b7684]"}`}>
            {value}
          </button>
        ))}
      </div>

      <StoryRail posts={stories} onSelect={setSelected} />

      {loading ? (
        <div className={compact ? "flex gap-3 overflow-hidden px-4" : "grid grid-cols-2 gap-3 px-4 sm:grid-cols-3"}>
          {Array.from({ length: compact ? 3 : 6 }, (_, index) => (
            <div key={index} className={`${compact ? "h-[300px] w-[238px] shrink-0" : "aspect-[3/5]"} animate-pulse rounded-[22px] bg-[#e9edf2]`} />
          ))}
        </div>
      ) : cards.length ? (
        <div className={compact
          ? "flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "grid grid-cols-2 gap-3 px-4 sm:grid-cols-3"}>
          {cards.map(post => (
            <div key={post.id} className={compact ? "snap-start" : "min-w-0"}>
              <SocialCard post={post} compact={compact} onSelect={() => setSelected(post)} />
            </div>
          ))}
          {compact && (
            <a href="/news?tab=social" className="flex w-24 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[22px] bg-[#f2f4f6] text-[11px] font-extrabold text-[#4e5968]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><ChevronRight size={17} /></span>
              모두 보기
            </a>
          )}
        </div>
      ) : (
        <div className="mx-4 rounded-[22px] bg-[#f6f7f9] px-5 py-10 text-center">
          <p className="text-[13px] font-bold text-[#4e5968]">수집된 로컬 콘텐츠가 아직 없어요</p>
          <p className="mt-1 text-[11px] text-[#8b95a1]">다음 정기 수집 후 자동으로 채워집니다.</p>
        </div>
      )}

      {selected && <SocialViewer post={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
