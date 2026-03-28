"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Flame, TrendingUp, Clock } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts, newsItems, nearbyStops, apartments } from "@/lib/mockData";
import { formatRelativeTime, formatPrice } from "@/lib/utils";

const quickMenus = [
  { emoji: "🚌", label: "버스", href: "/transport/" },
  { emoji: "🗺️", label: "상가지도", href: "/stores/" },
  { emoji: "🏠", label: "부동산", href: "/real-estate/" },
  { emoji: "📰", label: "뉴스", href: "/news/" },
  { emoji: "💬", label: "커뮤니티", href: "/community/" },
  { emoji: "🛒", label: "중고거래", href: "/community/" },
  { emoji: "🎯", label: "소모임", href: "/community/" },
  { emoji: "⭐", label: "즐겨찾기", href: "/mypage/" },
];

export default function HomePage() {
  const router = useRouter();
  const stop = nearbyStops[0];
  const bus = stop?.routes[0];
  const topNews = newsItems[0];
  const hotPosts = posts.filter(p => p.isHot).slice(0, 3);

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header showLocation />

      {/* Quick Menu */}
      <section className="bg-white px-5 pt-5 pb-4 mb-2">
        <div className="grid grid-cols-4 gap-y-4">
          {quickMenus.map(({ emoji, label, href }) => (
            <Link key={label} href={href}
              className="flex flex-col items-center gap-2 active:opacity-60">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F4F6] flex items-center justify-center text-2xl">
                {emoji}
              </div>
              <span className="text-[12px] text-[#4E5968] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bus Quick */}
      {stop && bus && (
        <section className="mx-4 mb-2">
          <button onClick={() => router.push("/transport/")}
            className="w-full bg-white rounded-2xl px-4 py-4 flex items-center justify-between active:bg-[#F2F4F6] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center">
                <span className="text-xl">🚌</span>
              </div>
              <div className="text-left">
                <p className="text-[12px] text-[#8B95A1]">{stop.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[14px] font-bold text-[#191F28]">{bus.routeNo}번</span>
                  <span className="text-[13px] text-[#4E5968]">{bus.destination} 방면</span>
                  {bus.isExpress && (
                    <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1.5 py-0.5 rounded">급행</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Clock size={13} className="text-[#F04452]" />
                <span className="text-[16px] font-black text-[#F04452]">{bus.arrivalMin}분</span>
              </div>
              <ChevronRight size={16} className="text-[#B0B8C1]" />
            </div>
          </button>
        </section>
      )}

      {/* HOT 게시글 */}
      <section className="mx-4 mb-2">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-[#F04452]" />
              <span className="text-[15px] font-bold text-[#191F28]">HOT 게시글</span>
            </div>
            <Link href="/community/"
              className="text-[13px] text-[#3182F6] font-medium active:opacity-60">
              전체보기
            </Link>
          </div>
          <div className="divide-y divide-[#F2F4F6]">
            {hotPosts.map(post => (
              <button key={post.id} onClick={() => router.push("/community/")}
                className="w-full px-4 py-3.5 flex items-start gap-3 active:bg-[#F2F4F6] transition-colors text-left">
                <span className="text-[11px] font-bold bg-[#EBF3FE] text-[#3182F6] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                  {post.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#191F28] truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-[#8B95A1]">{post.authorDong}</span>
                    <span className="text-[12px] text-[#B0B8C1]">·</span>
                    <span className="text-[12px] text-[#8B95A1]">{formatRelativeTime(post.createdAt)}</span>
                    <span className="text-[12px] text-[#B0B8C1] ml-auto">좋아요 {post.likeCount}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 최신 뉴스 */}
      <section className="mx-4 mb-2">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-[15px] font-bold text-[#191F28]">검단 뉴스</span>
            <Link href="/news/" className="text-[13px] text-[#3182F6] font-medium active:opacity-60">전체보기</Link>
          </div>
          <button onClick={() => router.push("/news/")}
            className="w-full px-4 pb-4 flex items-start gap-3 active:opacity-70 text-left">
            <div className="w-16 h-16 rounded-xl bg-[#EBF3FE] flex items-center justify-center text-2xl shrink-0">
              📰
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#191F28] leading-snug line-clamp-2">{topNews.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-[#3182F6] font-medium">{topNews.source}</span>
                <span className="text-[11px] text-[#B0B8C1]">{formatRelativeTime(topNews.publishedAt)}</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 부동산 */}
      <section className="mx-4 mb-2">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={16} className="text-[#00C471]" />
              <span className="text-[15px] font-bold text-[#191F28]">부동산 시세</span>
            </div>
            <Link href="/real-estate/" className="text-[13px] text-[#3182F6] font-medium active:opacity-60">전체보기</Link>
          </div>
          <div className="divide-y divide-[#F2F4F6]">
            {apartments.slice(0, 3).map(apt => (
              <button key={apt.id} onClick={() => router.push("/real-estate/")}
                className="w-full px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6] transition-colors">
                <div className="text-left">
                  <p className="text-[14px] font-medium text-[#191F28]">{apt.name}</p>
                  <p className="text-[12px] text-[#8B95A1] mt-0.5">{apt.dong} · {apt.recentDeal?.pyeong}평</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-[#00C471]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
                  <p className="text-[11px] text-[#8B95A1]">실거래</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 상가 지도 배너 */}
      <section className="mx-4 mb-4">
        <button onClick={() => router.push("/stores/")}
          className="w-full bg-[#3182F6] rounded-2xl p-4 flex items-center gap-4 active:bg-[#1B64DA] transition-colors">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">🗺️</div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-[15px]">상가 지도 열기</p>
            <p className="text-white/70 text-[12px] mt-0.5">층별 매장 · 화장실 비번 · 주차 안내</p>
          </div>
          <ChevronRight size={20} className="text-white/70 shrink-0" />
        </button>
      </section>

      <BottomNav />
    </div>
  );
}
