"use client";
import { useState } from "react";
import { Play, Eye, ExternalLink } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { newsItems } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import type { NewsType } from "@/lib/types";

const tabs: NewsType[] = ["뉴스", "유튜브", "인스타"];
const tabIcon: Record<NewsType, string> = { 뉴스: "📰", 유튜브: "▶️", 인스타: "📷" };
const typeBadge: Record<NewsType, string> = {
  뉴스: "bg-[#EBF3FE] text-[#3182F6]",
  유튜브: "bg-[#FFEBEE] text-[#F04452]",
  인스타: "bg-[#FCE4EC] text-[#D81B60]",
};

export default function NewsPage() {
  const [active, setActive] = useState<NewsType>("뉴스");
  const items = active === "뉴스" ? newsItems : newsItems.filter(n => n.type === active);
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

      <div className="px-4 pt-3 space-y-2">
        {/* Featured */}
        {featured && (
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="h-44 bg-[#EBF3FE] flex items-center justify-center relative">
              {featured.type === "유튜브"
                ? <div className="w-14 h-14 bg-[#F04452] rounded-full flex items-center justify-center"><Play size={24} className="text-white ml-1" /></div>
                : <span className="text-5xl">{tabIcon[featured.type]}</span>
              }
              <span className={`absolute top-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full ${typeBadge[featured.type]}`}>
                {featured.type}
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-[12px] text-[#8B95A1] mb-1">{featured.source}</p>
              <p className="text-[16px] font-bold text-[#191F28] leading-snug">{featured.title}</p>
              <p className="text-[13px] text-[#8B95A1] mt-2 line-clamp-2">{featured.summary}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#B0B8C1]">{formatRelativeTime(featured.publishedAt)}</span>
                  {featured.viewCount && (
                    <span className="flex items-center gap-0.5">
                      <Eye size={11} className="text-[#B0B8C1]" />
                      <span className="text-[12px] text-[#B0B8C1]">{featured.viewCount.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                <button className="flex items-center gap-1 text-[#3182F6] active:opacity-60">
                  <span className="text-[13px] font-medium">보기</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {rest.map(item => (
          <div key={item.id} className="bg-white rounded-2xl overflow-hidden flex">
            <div className="w-[90px] h-[90px] bg-[#F2F4F6] flex items-center justify-center shrink-0 relative">
              {item.type === "유튜브"
                ? <div className="w-8 h-8 bg-[#F04452] rounded-full flex items-center justify-center"><Play size={14} className="text-white ml-0.5" /></div>
                : <span className="text-3xl">{tabIcon[item.type]}</span>
              }
            </div>
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeBadge[item.type]}`}>{item.type}</span>
                <span className="text-[11px] text-[#8B95A1]">{item.source}</span>
              </div>
              <p className="text-[13px] font-medium text-[#191F28] leading-snug line-clamp-2">{item.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-[#B0B8C1]">{formatRelativeTime(item.publishedAt)}</span>
                {item.viewCount && (
                  <span className="flex items-center gap-0.5 ml-auto">
                    <Eye size={10} className="text-[#B0B8C1]" />
                    <span className="text-[11px] text-[#B0B8C1]">{item.viewCount.toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
