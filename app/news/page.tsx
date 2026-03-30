"use client";

import { useState } from "react";
import { Play, Eye, ExternalLink } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { newsItems } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { NewsType } from "@/lib/types";

const tabs: NewsType[] = ["뉴스", "유튜브", "인스타"];

const tabIcons: Record<NewsType, string> = {
  뉴스: "📰",
  유튜브: "▶️",
  인스타: "📷",
};

const typeColors: Record<NewsType, string> = {
  뉴스: "bg-blue-100 text-blue-700",
  유튜브: "bg-red-100 text-red-700",
  인스타: "bg-pink-100 text-pink-700",
};

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsType>("뉴스");

  const filtered = activeTab === "뉴스"
    ? newsItems
    : newsItems.filter((n) => n.type === activeTab);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="검단 뉴스" showNotification />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[56px] z-30">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-11 text-[13px] font-medium press-effect border-b-2 transition-colors",
                activeTab === tab
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-400 border-transparent"
              )}
            >
              <span>{tabIcons[tab]}</span>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Featured Article */}
        {featured && (
          <div
            className="bg-white rounded-2xl overflow-hidden card-shadow press-effect"
            onClick={() => featured.url !== "#" && window.open(featured.url, "_blank")}
          >
            <div className="h-48 bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-200 relative flex items-center justify-center">
              {featured.type === "유튜브" && (
                <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center">
                  <Play size={24} className="text-white ml-1" />
                </div>
              )}
              {featured.type === "인스타" && (
                <span className="text-6xl">📸</span>
              )}
              {featured.type === "뉴스" && (
                <span className="text-6xl">📰</span>
              )}
              <span className={cn(
                "absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                typeColors[featured.type]
              )}>
                {featured.type}
              </span>
            </div>
            <div className="p-4">
              <p className="text-[12px] font-medium text-gray-500">{featured.source}</p>
              <h2 className="text-[16px] font-bold text-gray-900 mt-1 leading-snug">
                {featured.title}
              </h2>
              <p className="text-[13px] text-gray-500 mt-2 leading-relaxed line-clamp-2">
                {featured.summary}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">{formatRelativeTime(featured.publishedAt)}</span>
                  {featured.viewCount && (
                    <>
                      <span className="text-gray-200">·</span>
                      <div className="flex items-center gap-1">
                        <Eye size={11} className="text-gray-400" />
                        <span className="text-[11px] text-gray-400">{featured.viewCount.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); if (featured.url !== "#") window.open(featured.url, "_blank"); }}
                  className="flex items-center gap-1 text-blue-600 press-effect"
                >
                  <span className="text-[12px] font-medium">보기</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rest of articles */}
        {rest.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl overflow-hidden card-shadow press-effect flex gap-0"
            onClick={() => item.url !== "#" && window.open(item.url, "_blank")}
          >
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 relative">
              {item.type === "유튜브" && (
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <Play size={14} className="text-white ml-0.5" />
                </div>
              )}
              {item.type === "인스타" && <span className="text-3xl">📸</span>}
              {item.type === "뉴스" && <span className="text-3xl">📰</span>}
            </div>
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  typeColors[item.type]
                )}>
                  {item.type}
                </span>
                <span className="text-[11px] text-gray-400">{item.source}</span>
              </div>
              <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-gray-400">{formatRelativeTime(item.publishedAt)}</span>
                {item.viewCount && (
                  <div className="flex items-center gap-0.5 ml-auto">
                    <Eye size={10} className="text-gray-300" />
                    <span className="text-[11px] text-gray-300">{item.viewCount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-gray-500 text-sm">콘텐츠가 없습니다</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
