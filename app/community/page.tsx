"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ThumbsUp, MessageSquare, Eye, Flame, Pin,
  ExternalLink, RefreshCw, TrendingUp, TrendingDown, MapPin,
  ChevronRight, ChevronUp, ChevronDown,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts, newsItems, apartments } from "@/lib/mockData";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchGeumdanNews, type NewsArticle } from "@/lib/api/news";
import type { CommunityCategory, NewsType } from "@/lib/types";
import type { Apartment } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────
type SoikTab = "커뮤니티" | "뉴스" | "시세";

// ─── Community ───────────────────────────────────────────────
const categories: CommunityCategory[] = ["전체","맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];
const catColor: Record<CommunityCategory, string> = {
  전체: "bg-[#3182F6] text-white",
  맘카페: "bg-[#FFE8EF] text-[#D63384]",
  맛집: "bg-[#FFF3E0] text-[#E65100]",
  부동산: "bg-[#E8F5E9] text-[#2E7D32]",
  중고거래: "bg-[#FFFDE7] text-[#F57F17]",
  "분실/목격": "bg-[#FFEBEE] text-[#C62828]",
  동네질문: "bg-[#EBF3FE] text-[#1565C0]",
  소모임: "bg-[#F3E5F5] text-[#6A1B9A]",
};

function CommunityTab() {
  const router = useRouter();
  const [active, setActive] = useState<CommunityCategory>("전체");
  const filtered = active === "전체" ? posts : posts.filter(p => p.category === active);

  return (
    <div className="pb-4">
      {/* Category filter */}
      <div className="bg-white sticky top-[104px] z-20 border-b border-[#F2F4F6]">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors ${active === cat ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="px-4 pt-3 space-y-2">
        {filtered.map(post => (
          <button key={post.id} onClick={() => router.push(`/community/detail/?id=${post.id}`)}
            className="w-full bg-white rounded-2xl px-4 py-4 text-left active:bg-[#F2F4F6] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              {post.isPinned && <Pin size={12} className="text-[#3182F6]" />}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catColor[post.category]}`}>
                {post.category}
              </span>
              {post.isHot && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#F04452]">
                  <Flame size={10} /> HOT
                </span>
              )}
            </div>
            <p className="text-[15px] font-medium text-[#191F28] leading-snug">{post.title}</p>
            <p className="text-[13px] text-[#8B95A1] mt-1 line-clamp-1">{post.content}</p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F2F4F6]">
              <span className="text-[12px] text-[#8B95A1]">{post.author} · {post.authorDong}</span>
              <span className="text-[12px] text-[#B0B8C1]">{formatRelativeTime(post.createdAt)}</span>
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1">
                  <ThumbsUp size={12} className="text-[#B0B8C1]" />
                  <span className="text-[12px] text-[#B0B8C1]">{post.likeCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare size={12} className="text-[#B0B8C1]" />
                  <span className="text-[12px] text-[#B0B8C1]">{post.commentCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye size={12} className="text-[#B0B8C1]" />
                  <span className="text-[12px] text-[#B0B8C1]">{post.viewCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── News ─────────────────────────────────────────────────────
const newsTabTypes: NewsType[] = ["뉴스", "유튜브", "인스타"];
const tabIcon: Record<NewsType, string> = { 뉴스: "📰", 유튜브: "▶️", 인스타: "📷" };
const cardGradients = [
  "from-[#1B64DA] to-[#3182F6]",
  "from-[#065F46] to-[#00C471]",
  "from-[#7C3AED] to-[#A78BFA]",
  "from-[#B45309] to-[#F59E0B]",
  "from-[#BE123C] to-[#F43F5E]",
  "from-[#0E7490] to-[#22D3EE]",
];

interface CardItem {
  id: string; title: string; summary?: string;
  source: string; publishedAt: string; url: string; type: NewsType;
}

function NewsTab() {
  const [active, setActive] = useState<NewsType>("뉴스");
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const articles = await fetchGeumdanNews();
      if (articles.length > 0) {
        setRealNews(articles);
        setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      }
      setLoading(false);
    })();
  }, []);

  const items: CardItem[] = active === "뉴스"
    ? (realNews.length > 0 ? realNews : newsItems.filter(n => n.type === "뉴스")).map(n => ({ ...n }))
    : newsItems.filter(n => n.type === active).map(n => ({ ...n }));

  const featured = items.slice(0, 8);
  const rest = items.slice(8);

  return (
    <div className="pb-4">
      {/* Sub-tabs */}
      <div className="bg-white sticky top-[104px] z-20 border-b border-[#F2F4F6] flex">
        {newsTabTypes.map(t => (
          <button key={t} onClick={() => setActive(t)}
            className={`flex-1 h-11 flex items-center justify-center gap-1.5 text-[14px] font-semibold border-b-2 transition-colors ${active === t ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"}`}>
            <span>{tabIcon[t]}</span>{t}
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {realNews.length > 0 && active === "뉴스"
          ? <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00C471] animate-pulse" />
              <span className="text-[12px] text-[#4E5968]">실시간 검단 뉴스 {realNews.length}건</span>
            </div>
          : <span className="text-[12px] text-[#8B95A1]">검단 신도시 소식</span>
        }
        <button onClick={async () => {
          setLoading(true);
          const articles = await fetchGeumdanNews();
          if (articles.length > 0) { setRealNews(articles); setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })); }
          setLoading(false);
        }} className="flex items-center gap-1 active:opacity-60">
          <RefreshCw size={12} className={`text-[#8B95A1] ${loading ? "animate-spin" : ""}`} />
          {lastUpdated && <span className="text-[11px] text-[#B0B8C1]">{lastUpdated}</span>}
        </button>
      </div>

      {/* Card scroll */}
      {loading && active === "뉴스" ? (
        <div className="flex gap-3 px-4 overflow-hidden">
          {[0,1].map(i => <div key={i} className="shrink-0 w-[280px] h-[180px] bg-[#E5E8EB] rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div ref={scrollRef} className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {featured.map((item, i) => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              className={`shrink-0 w-[280px] bg-gradient-to-br ${cardGradients[i % cardGradients.length]} rounded-2xl p-5 flex flex-col justify-between min-h-[180px] active:opacity-80`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">{tabIcon[item.type]}</span>
                  <span className="text-[11px] text-white/70">{item.source}</span>
                </div>
                <p className="text-[16px] font-bold text-white leading-snug line-clamp-4">{item.title}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[12px] text-white/70">{formatRelativeTime(item.publishedAt)}</span>
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <ExternalLink size={13} className="text-white" />
                </div>
              </div>
            </a>
          ))}
          <div className="shrink-0 w-4" />
        </div>
      )}

      {/* Rest list */}
      {rest.length > 0 && (
        <div className="px-4 space-y-2 mt-4">
          <p className="text-[13px] font-bold text-[#8B95A1] mb-1">더 보기</p>
          {rest.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              className="bg-white rounded-2xl px-4 py-4 flex items-start gap-3 active:bg-[#F2F4F6] block">
              <div className="w-[48px] h-[48px] rounded-xl bg-[#EBF3FE] flex items-center justify-center text-xl shrink-0">
                {tabIcon[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#191F28] leading-snug line-clamp-2">{item.title}</p>
                {item.summary && <p className="text-[12px] text-[#8B95A1] mt-1 line-clamp-1">{item.summary}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-medium text-[#3182F6]">{item.source}</span>
                  <span className="text-[11px] text-[#B0B8C1]">·</span>
                  <span className="text-[11px] text-[#B0B8C1]">{formatRelativeTime(item.publishedAt)}</span>
                  <ExternalLink size={10} className="text-[#B0B8C1] ml-auto" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-[16px] font-bold text-[#191F28]">뉴스가 없어요</p>
        </div>
      )}
    </div>
  );
}

// ─── 시세 ─────────────────────────────────────────────────────
function PriceTag({ curr, prev }: { curr: number; prev: number }) {
  const diff = curr - prev;
  if (diff === 0) return <span className="text-[11px] text-[#8B95A1]">보합</span>;
  const pct = ((Math.abs(diff) / prev) * 100).toFixed(1);
  return diff > 0
    ? <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#F04452]"><TrendingUp size={10} />+{pct}%</span>
    : <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#3182F6]"><TrendingDown size={10} />-{pct}%</span>;
}

function SiseTab() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const avgPrice = Math.round(apartments.reduce((s, a) => s + (a.recentDeal?.price ?? 0), 0) / apartments.length);

  return (
    <div className="pb-4">
      {/* Summary banner */}
      <div className="mx-4 mt-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 mb-3">
        <p className="text-emerald-100 text-[12px] font-medium">검단 신도시 평균 실거래가</p>
        <p className="text-white text-[24px] font-black mt-1">{formatPrice(avgPrice)}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <TrendingUp size={14} className="text-emerald-300" />
          <span className="text-emerald-200 text-[12px]">전월 대비 평균 +1.2% 상승</span>
        </div>
      </div>

      {/* Apt list */}
      <div className="px-4 space-y-3">
        {apartments.map(apt => {
          const h = apt.sizes[0].priceHistory;
          const curr = h[h.length - 1].price;
          const prev = h[h.length - 2]?.price ?? curr;
          const isOpen = selected === apt.id;
          return (
            <div key={apt.id}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all ${isOpen ? "ring-2 ring-[#3182F6]" : ""}`}>
              <button className="w-full px-4 py-4 text-left" onClick={() => setSelected(isOpen ? null : apt.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] font-bold text-[#191F28]">{apt.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <MapPin size={11} className="text-[#8B95A1] shrink-0" />
                      <span className="text-[12px] text-[#8B95A1]">{apt.dong}</span>
                      <span className="text-[#E5E8EB]">·</span>
                      <span className="text-[12px] text-[#8B95A1]">{apt.built}년</span>
                      <span className="text-[#E5E8EB]">·</span>
                      <span className="text-[12px] text-[#8B95A1]">{apt.households.toLocaleString()}세대</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[16px] font-black text-emerald-600">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
                    <p className="text-[11px] text-[#8B95A1]">{apt.recentDeal?.pyeong}평 실거래</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {apt.sizes.map((sz, i) => (
                    <div key={i} className="bg-[#F2F4F6] rounded-xl px-3 py-2 text-center">
                      <p className="text-[12px] font-semibold text-[#4E5968]">{sz.pyeong}평</p>
                      <p className="text-[11px] text-emerald-600 font-bold">{formatPrice(sz.avgPrice)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F2F4F6]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-[#8B95A1]">전월 대비</span>
                    <PriceTag curr={curr} prev={prev} />
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-[#8B95A1]">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>추이</span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[#F2F4F6] px-4 py-3 bg-[#F8FAFB]">
                  <div className="space-y-1.5">
                    {apt.sizes[0].priceHistory.slice(-6).map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[12px] text-[#8B95A1]">{p.date}</span>
                        <span className="text-[13px] font-semibold text-[#191F28]">{formatPrice(p.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link to full real-estate page */}
      <button onClick={() => router.push("/real-estate/")}
        className="mx-4 mt-4 w-[calc(100%-32px)] bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between active:bg-[#F2F4F6]">
        <div>
          <p className="text-[14px] font-bold text-[#191F28]">매물 / 전월세 보기</p>
          <p className="text-[12px] text-[#8B95A1] mt-0.5">내 집 시세 관리 및 전체 매물 확인</p>
        </div>
        <ChevronRight size={18} className="text-[#B0B8C1]" />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
const mainTabs: SoikTab[] = ["커뮤니티", "뉴스", "시세"];

function SoikContent() {
  const router = useRouter();
  const [tab, setTab] = useState<SoikTab>("커뮤니티");

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="소식" />

      {/* Main tabs */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6] flex">
        {mainTabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-11 text-[15px] font-semibold border-b-2 transition-colors ${tab === t ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "커뮤니티" && <CommunityTab />}
      {tab === "뉴스" && <NewsTab />}
      {tab === "시세" && <SiseTab />}

      {/* FAB - only on 커뮤니티 tab */}
      {tab === "커뮤니티" && (
        <button onClick={() => router.push("/community/write/")}
          className="fixed bottom-[74px] right-4 w-14 h-14 bg-[#3182F6] rounded-full shadow-lg flex items-center justify-center active:bg-[#1B64DA] z-40">
          <Plus size={24} className="text-white" />
        </button>
      )}

      <BottomNav />
    </div>
  );
}

export default function CommunityPage() {
  return <Suspense><SoikContent /></Suspense>;
}
