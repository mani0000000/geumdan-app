"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bus, Building2, Newspaper, Users, Home as HomeIcon,
  TrendingUp, ChevronRight, MapPin, Clock, Flame,
  ThumbsUp, MessageSquare, Eye
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts, newsItems, nearbyStops, apartments } from "@/lib/mockData";
import { formatRelativeTime, formatPrice } from "@/lib/utils";

const quickMenus = [
  { icon: "🚌", label: "버스", href: "/transport", color: "bg-blue-50" },
  { icon: "🏢", label: "상가지도", href: "/stores", color: "bg-purple-50" },
  { icon: "🏠", label: "부동산", href: "/real-estate", color: "bg-green-50" },
  { icon: "📰", label: "뉴스", href: "/news", color: "bg-orange-50" },
  { icon: "💬", label: "커뮤니티", href: "/community", color: "bg-pink-50" },
  { icon: "🎯", label: "소모임", href: "/community?category=소모임", color: "bg-indigo-50" },
  { icon: "🛒", label: "중고거래", href: "/community?category=중고거래", color: "bg-yellow-50" },
  { icon: "🗺️", label: "더보기", href: "/mypage", color: "bg-gray-100" },
];

const banners = [
  {
    id: 1,
    badge: "교통",
    title: "2호선 연장 착공\n올해 하반기 시작!",
    color: "from-blue-600 to-blue-700",
    icon: "🚇",
  },
  {
    id: 2,
    badge: "상가",
    title: "SK뷰 센트럴\n5월 신규 입점 오픈",
    color: "from-emerald-600 to-emerald-700",
    icon: "🏪",
  },
  {
    id: 3,
    badge: "이벤트",
    title: "검단 봄 축제\n4월 15일 개최",
    color: "from-purple-600 to-purple-700",
    icon: "🎉",
  },
];

export default function HomePage() {
  const router = useRouter();
  const hotPost = posts.find((p) => p.isHot);
  const topApt = apartments[0];
  const topStop = nearbyStops[0];
  const topBus = topStop?.routes[0];
  const topNews = newsItems[0];

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header showLocation showNotification />

      {/* Banner Carousel (static) */}
      <div className="px-4 pt-3 pb-2">
        <div className="overflow-x-auto flex gap-3 snap-x snap-mandatory">
          {banners.map((b) => (
            <div
              key={b.id}
              className={`snap-start shrink-0 w-[88vw] max-w-[360px] bg-gradient-to-br ${b.color} rounded-2xl p-4 flex items-center gap-4 press-effect`}
            >
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                {b.icon}
              </div>
              <div>
                <span className="text-white/70 text-[11px] font-medium">{b.badge}</span>
                <p className="text-white font-bold text-[16px] leading-snug mt-0.5 whitespace-pre-line">
                  {b.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Menu */}
      <section className="mx-4 bg-white rounded-2xl p-4 mb-3 card-shadow">
        <div className="grid grid-cols-4 gap-2">
          {quickMenus.map(({ icon, label, href, color }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2 press-effect"
            >
              <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-2xl`}>
                {icon}
              </div>
              <span className="text-[11px] text-gray-700 font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bus Quick Info */}
      {topStop && topBus && (
        <section className="mx-4 mb-3">
          <div
            className="bg-white rounded-2xl overflow-hidden card-shadow press-effect"
            onClick={() => router.push("/transport")}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Bus size={16} className="text-blue-600" />
                <span className="text-[13px] font-semibold text-gray-900">근처 버스</span>
                <span className="text-[12px] text-gray-400">{topStop.name}</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[13px] font-bold px-2.5 py-1 rounded-lg">
                    {topBus.routeNo}
                  </span>
                  <span className="text-[13px] text-gray-600">{topBus.destination} 방면</span>
                  {topBus.isExpress && (
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded">급행</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={13} className="text-red-500" />
                  <span className="text-red-500 font-bold text-[14px]">{topBus.arrivalMin}분</span>
                  <span className="text-gray-400 text-[11px]">후 도착</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOT 게시글 */}
      <section className="mx-4 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Flame size={15} className="text-orange-500" />
            <span className="text-[14px] font-bold text-gray-900">HOT 게시글</span>
          </div>
          <Link href="/community" className="text-[12px] text-gray-400 press-effect">
            더보기
          </Link>
        </div>
        <div className="space-y-2">
          {posts.filter((p) => p.isHot).slice(0, 3).map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl px-4 py-3 card-shadow press-effect"
              onClick={() => router.push("/community")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {post.category}
                    </span>
                  </div>
                  <p className="text-[14px] font-medium text-gray-900 truncate">{post.title}</p>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span className="text-[11px] text-gray-400">{post.authorDong}</span>
                    <span className="text-[11px] text-gray-400">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <ThumbsUp size={11} className="text-gray-400" />
                      <span className="text-[11px] text-gray-400">{post.likeCount}</span>
                      <MessageSquare size={11} className="text-gray-400 ml-1" />
                      <span className="text-[11px] text-gray-400">{post.commentCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 최신 뉴스 */}
      <section className="mx-4 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Newspaper size={15} className="text-blue-600" />
            <span className="text-[14px] font-bold text-gray-900">검단 뉴스</span>
          </div>
          <Link href="/news" className="text-[12px] text-gray-400 press-effect">
            더보기
          </Link>
        </div>
        <div
          className="bg-white rounded-2xl overflow-hidden card-shadow press-effect"
          onClick={() => router.push("/news")}
        >
          <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <span className="text-5xl">🏗️</span>
          </div>
          <div className="p-3.5">
            <span className="text-[11px] font-medium text-blue-600">{topNews?.source}</span>
            <p className="text-[14px] font-semibold text-gray-900 mt-0.5 leading-snug">
              {topNews?.title}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-gray-400">
                {topNews && formatRelativeTime(topNews.publishedAt)}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <Eye size={11} className="text-gray-400" />
                <span className="text-[11px] text-gray-400">
                  {topNews?.viewCount?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 부동산 시세 */}
      <section className="mx-4 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={15} className="text-emerald-600" />
            <span className="text-[14px] font-bold text-gray-900">부동산 시세</span>
          </div>
          <Link href="/real-estate" className="text-[12px] text-gray-400 press-effect">
            더보기
          </Link>
        </div>
        <div className="space-y-2">
          {apartments.slice(0, 3).map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-xl px-4 py-3.5 card-shadow press-effect flex items-center"
              onClick={() => router.push("/real-estate")}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 truncate">{apt.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin size={11} className="text-gray-400" />
                  <span className="text-[12px] text-gray-400">{apt.dong}</span>
                  <span className="text-[12px] text-gray-400">·</span>
                  <span className="text-[12px] text-gray-400">{apt.built}년</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-bold text-emerald-600">
                  {formatPrice(apt.recentDeal?.price ?? 0)}
                </p>
                <p className="text-[11px] text-gray-400">
                  {apt.recentDeal?.pyeong}평
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating CTAs */}
      <section className="mx-4 mb-4">
        <div
          className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-4 press-effect"
          onClick={() => router.push("/stores")}
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
            🗺️
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-[15px]">상가 지도 둘러보기</p>
            <p className="text-white/70 text-[12px] mt-0.5">층별 매장, 화장실 비번, 주차 정보</p>
          </div>
          <ChevronRight size={20} className="text-white/70" />
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
