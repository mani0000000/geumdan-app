"use client";
import { useState, useEffect } from "react";
import { Play, Eye, ExternalLink, RefreshCw } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { newsItems } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import { fetchGeumdanNews, type NewsArticle } from "@/lib/api/news";
import type { NewsType } from "@/lib/types";

const tabs: NewsType[] = ["뉴스", "유튜브", "인스타"];
const tabIcon: Record<NewsType, string> = { 뉴스: "📰", 유튜브: "▶️", 인스타: "📷" };
const typeBadge: Record<NewsType, string> = {
  뉴스: "bg-[#EBF3FE] text-[#3182F6]",
  유튜브: "bg-[#FFEBEE] text-[#F04452]",
  인스타: "bg-[#FCE4EC] text-[#D81B60]",
};

function NewsListItem({ item }: { item: { id: string; title: string; summary: string; source: string; publishedAt: string; url: string; type: NewsType } }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="bg-white rounded-2xl overflow-hidden flex active:opacity-70">
      <div className="w-[90px] min-h-[90px] bg-[#F2F4F6] flex items-center justify-center shrink-0">
        {item.type === "유튜브"
          ? <div className="w-8 h-8 bg-[#F04452] rounded-full flex items-center justify-center">
              <Play size={14} className="text-white ml-0.5" />
            </div>
          : <span className="text-3xl">{tabIcon[item.type]}</span>
        }
      </div>
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeBadge[item.type]}`}>{item.type}</span>
          <span className="text-[11px] text-[#8B95A1] truncate">{item.source}</span>
        </div>
        <p className="text-[13px] font-medium text-[#191F28] leading-snug line-clamp-2">{item.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-[#B0B8C1]">{formatRelativeTime(item.publishedAt)}</span>
          <ExternalLink size={10} className="text-[#B0B8C1] ml-auto" />
        </div>
      </div>
    </a>
  );
}

function SkeletonNews() {
  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl p-4 h-44 flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden flex h-[90px]">
          <Skeleton className="w-[90px] h-full rounded-none" />
          <div className="flex-1 p-3 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NewsPage() {
  const [active, setActive] = useState<NewsType>("뉴스");
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadNews = async () => {
    setLoading(true);
    const articles = await fetchGeumdanNews();
    if (articles.length > 0) {
      setRealNews(articles);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    }
    setLoading(false);
  };

  useEffect(() => { loadNews(); }, []);

  // Merge real news with mock for non-news tabs
  const newsSource = realNews.length > 0 ? realNews : newsItems.filter(n => n.type === "뉴스");
  const items = active === "뉴스"
    ? newsSource
    : newsItems.filter(n => n.type === active);

  const [featured, ...rest] = items;

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="검단 뉴스" />

      {/* Tabs */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6] flex">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActive(tab)}
            className={`flex-1 h-11 flex items-center justify-center gap-1.5 text-[14px] font-semibold border-b-2 transition-colors active:opacity-70 ${active === tab ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"}`}>
            <span>{tabIcon[tab]}</span>{tab}
          </button>
        ))}
      </div>

      {/* Real-time badge */}
      {active === "뉴스" && (
        <div className="flex items-center justify-between px-4 py-2.5">
          {realNews.length > 0
            ? <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C471] animate-pulse" />
                <span className="text-[12px] text-[#4E5968]">실시간 검단 신도시 뉴스</span>
              </div>
            : <span className="text-[12px] text-[#8B95A1]">최신 뉴스</span>
          }
          <button onClick={loadNews} className="flex items-center gap-1 active:opacity-60">
            <RefreshCw size={12} className={`text-[#8B95A1] ${loading ? "animate-spin" : ""}`} />
            {lastUpdated && <span className="text-[11px] text-[#B0B8C1]">{lastUpdated} 업데이트</span>}
          </button>
        </div>
      )}

      <div className="px-4 space-y-2 pb-2">
        {loading && active === "뉴스" ? (
          <SkeletonNews />
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <a href={"url" in featured ? featured.url : "#"} target="_blank" rel="noopener noreferrer"
                className="bg-white rounded-2xl overflow-hidden block active:opacity-70">
                <div className="h-44 bg-[#EBF3FE] flex items-center justify-center relative">
                  {featured.type === "유튜브"
                    ? <div className="w-14 h-14 bg-[#F04452] rounded-full flex items-center justify-center">
                        <Play size={24} className="text-white ml-1" />
                      </div>
                    : <span className="text-5xl">{tabIcon[featured.type]}</span>
                  }
                  <span className={`absolute top-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full ${typeBadge[featured.type]}`}>
                    {featured.type}
                  </span>
                  {realNews.length > 0 && active === "뉴스" && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold bg-[#00C471] text-white px-2 py-0.5 rounded-full">실시간</span>
                  )}
                </div>
                <div className="px-4 py-4">
                  <p className="text-[12px] text-[#8B95A1] mb-1">{featured.source}</p>
                  <p className="text-[16px] font-bold text-[#191F28] leading-snug">{featured.title}</p>
                  {"summary" in featured && featured.summary && (
                    <p className="text-[13px] text-[#8B95A1] mt-2 line-clamp-2">{featured.summary}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#B0B8C1]">{formatRelativeTime(featured.publishedAt)}</span>
                      {"viewCount" in featured && featured.viewCount && (
                        <span className="flex items-center gap-0.5">
                          <Eye size={11} className="text-[#B0B8C1]" />
                          <span className="text-[12px] text-[#B0B8C1]">{featured.viewCount.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[#3182F6]">
                      <span className="text-[13px] font-medium">보기</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* List */}
            {rest.map((item) => (
              <NewsListItem key={item.id} item={{ ...item, type: item.type as NewsType }} />
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
