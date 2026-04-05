"use client";
import { useState, useEffect, useRef } from "react";
import { ExternalLink, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { newsItems } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import { fetchGeumdanNews, type NewsArticle } from "@/lib/api/news";
import { fetchNewsArticles } from "@/lib/db/news";
import type { NewsType } from "@/lib/types";

const tabs: NewsType[] = ["뉴스", "유튜브", "인스타"];
const tabIcon: Record<NewsType, string> = { 뉴스: "📰", 유튜브: "▶️", 인스타: "📷" };

// Gradient palettes for card news
const cardGradients = [
  "from-[#1B64DA] to-[#3182F6]",
  "from-[#065F46] to-[#00C471]",
  "from-[#7C3AED] to-[#A78BFA]",
  "from-[#B45309] to-[#F59E0B]",
  "from-[#BE123C] to-[#F43F5E]",
  "from-[#0E7490] to-[#22D3EE]",
  "from-[#1D4ED8] to-[#818CF8]",
  "from-[#166534] to-[#4ADE80]",
];

interface CardItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  publishedAt: string;
  url: string;
  type: NewsType;
  thumbnail?: string;
}

function NewsCard({ item, gradient }: { item: CardItem; gradient: string; index: number }) {
  const typeTag = item.type === "유튜브" ? "▶ 유튜브" : item.type === "인스타" ? "📷 인스타" : "📰 뉴스";
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="shrink-0 w-[280px] rounded-2xl overflow-hidden active:opacity-80"
      style={{ minHeight: 320 }}>
      {/* Image area */}
      <div className="relative w-full" style={{ height: 180 }}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title}
            className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Type badge */}
        <span className="absolute top-3 left-3 text-[12px] font-bold bg-black/40 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
          {typeTag}
        </span>
        <span className="absolute top-3 right-3 text-[12px] text-white/80 font-medium">
          {item.source}
        </span>
      </div>
      {/* Text area */}
      <div className="bg-white px-4 py-3 flex flex-col gap-1" style={{ minHeight: 140 }}>
        <p className="text-[16px] font-bold text-[#191F28] leading-snug line-clamp-3">{item.title}</p>
        {item.summary && (
          <p className="text-[13px] text-[#8B95A1] line-clamp-2 mt-0.5">{item.summary}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-[12px] text-[#B0B8C1]">{formatRelativeTime(item.publishedAt)}</span>
          <div className="w-7 h-7 bg-[#EBF3FE] rounded-full flex items-center justify-center">
            <ExternalLink size={13} className="text-[#3182F6]" />
          </div>
        </div>
      </div>
    </a>
  );
}

function CardNewsRow({ items, loading }: { items: CardItem[]; loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [current, setCurrent] = useState(0);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const card = 296; // 280 + gap
    scrollRef.current.scrollBy({ left: dir === "left" ? -card : card, behavior: "smooth" });
  };

  const onScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanLeft(scrollLeft > 0);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 4);
    setCurrent(Math.round(scrollLeft / 296));
  };

  if (loading) {
    return (
      <div className="flex gap-3 px-4 overflow-hidden">
        {[0, 1].map(i => (
          <div key={i} className="shrink-0 w-[280px] h-[180px] bg-[#E5E8EB] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div ref={scrollRef} onScroll={onScroll}
        className="flex gap-3 px-4 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item}
            gradient={cardGradients[i % cardGradients.length]} index={i} />
        ))}
        <div className="shrink-0 w-4" />
      </div>

      {/* Nav arrows - desktop helper */}
      {canLeft && (
        <button onClick={() => scroll("left")}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-white shadow-lg rounded-full items-center justify-center active:opacity-70">
          <ChevronLeft size={18} className="text-[#191F28]" />
        </button>
      )}
      {canRight && (
        <button onClick={() => scroll("right")}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-white shadow-lg rounded-full items-center justify-center active:opacity-70">
          <ChevronRight size={18} className="text-[#191F28]" />
        </button>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.slice(0, 8).map((_, i) => (
            <div key={i} className={`rounded-full transition-all ${i === current ? "w-4 h-1.5 bg-[#3182F6]" : "w-1.5 h-1.5 bg-[#E5E8EB]"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsListItem({ item }: { item: CardItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="bg-white rounded-2xl px-4 py-4 flex items-start gap-3 active:bg-[#F2F4F6] transition-colors block">
      <div className="w-[48px] h-[48px] rounded-xl bg-[#EBF3FE] flex items-center justify-center text-xl shrink-0">
        {tabIcon[item.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-[#191F28] leading-snug line-clamp-2">{item.title}</p>
        {item.summary && (
          <p className="text-[13px] text-[#8B95A1] mt-1 line-clamp-1">{item.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[12px] font-medium text-[#3182F6]">{item.source}</span>
          <span className="text-[12px] text-[#B0B8C1]">·</span>
          <span className="text-[12px] text-[#B0B8C1]">{formatRelativeTime(item.publishedAt)}</span>
          <ExternalLink size={10} className="text-[#B0B8C1] ml-auto" />
        </div>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const [active, setActive] = useState<NewsType>("뉴스");
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  const [dbItems, setDbItems] = useState(newsItems);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadNews = async () => {
    setLoading(true);
    const [articles, dbNews] = await Promise.all([
      fetchGeumdanNews(),
      fetchNewsArticles(undefined, 50),
    ]);
    if (articles.length > 0) {
      setRealNews(articles);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    }
    if (dbNews.length > 0) setDbItems(dbNews);
    setLoading(false);
  };

  useEffect(() => { loadNews(); }, []);

  const newsSource: CardItem[] = active === "뉴스"
    ? (realNews.length > 0
        ? realNews.map(n => ({ ...n, summary: n.summary }))
        : dbItems.filter(n => n.type === "뉴스").map(n => ({ ...n, summary: n.summary, thumbnail: n.thumbnail }))
      )
    : dbItems.filter(n => n.type === active).map(n => ({ ...n, thumbnail: n.thumbnail }));

  const featured = newsSource.slice(0, 8);
  const rest = newsSource.slice(8);

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="검단 뉴스" />

      {/* Tabs */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6] flex">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActive(tab)}
            className={`flex-1 h-11 flex items-center justify-center gap-1.5 text-[15px] font-semibold border-b-2 transition-colors active:opacity-70 ${active === tab ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"}`}>
            <span>{tabIcon[tab]}</span>{tab}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {realNews.length > 0 && active === "뉴스"
          ? <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00C471] animate-pulse" />
              <span className="text-[13px] text-[#4E5968]">실시간 검단 뉴스 {realNews.length}건</span>
            </div>
          : <span className="text-[13px] text-[#8B95A1]">검단 신도시 소식</span>
        }
        <button onClick={loadNews} className="flex items-center gap-1 active:opacity-60">
          <RefreshCw size={12} className={`text-[#8B95A1] ${loading ? "animate-spin" : ""}`} />
          {lastUpdated && <span className="text-[12px] text-[#B0B8C1]">{lastUpdated}</span>}
        </button>
      </div>

      {/* Card news row */}
      <div className="mb-4">
        <CardNewsRow items={featured} loading={loading && active === "뉴스"} />
      </div>

      {/* Rest as list */}
      {rest.length > 0 && (
        <div className="px-4 space-y-2">
          <p className="text-[14px] font-bold text-[#8B95A1] mb-1">더 보기</p>
          {rest.map(item => (
            <NewsListItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {!loading && newsSource.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-[17px] font-bold text-[#191F28]">뉴스가 없어요</p>
          <p className="text-[14px] text-[#8B95A1] mt-2">잠시 후 다시 확인해보세요</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
