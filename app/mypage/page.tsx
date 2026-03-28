"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Star, FileText, MessageSquare,
  Tag, Bell, Shield, HelpCircle, LogOut,
  Settings, Edit3, MapPin, Calendar
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { currentUser, posts } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const levelColors: Record<string, string> = {
  새싹: "bg-green-100 text-green-700",
  주민: "bg-blue-100 text-blue-700",
  이웃: "bg-purple-100 text-purple-700",
  터줏대감: "bg-orange-100 text-orange-700",
};

const levelProgress: Record<string, number> = {
  새싹: 15,
  주민: 40,
  이웃: 65,
  터줏대감: 100,
};

const menuGroups = [
  {
    title: "내 활동",
    items: [
      { icon: FileText, label: "내가 쓴 글", badge: String(currentUser.postCount), color: "text-blue-600" },
      { icon: MessageSquare, label: "내가 쓴 댓글", badge: String(currentUser.commentCount), color: "text-purple-600" },
      { icon: Tag, label: "다운로드한 쿠폰", badge: "3", color: "text-orange-600" },
    ],
  },
  {
    title: "즐겨찾기",
    items: [
      { icon: Star, label: "즐겨찾는 버스", badge: "2", color: "text-yellow-500" },
      { icon: Star, label: "즐겨찾는 상가", badge: "5", color: "text-yellow-500" },
      { icon: Star, label: "관심 아파트", badge: "3", color: "text-yellow-500" },
    ],
  },
  {
    title: "설정",
    items: [
      { icon: Bell, label: "알림 설정", badge: null, color: "text-gray-600" },
      { icon: Shield, label: "개인정보 보호", badge: null, color: "text-gray-600" },
      { icon: Settings, label: "앱 설정", badge: null, color: "text-gray-600" },
      { icon: HelpCircle, label: "고객센터 / 신고", badge: null, color: "text-gray-600" },
    ],
  },
];

export default function MyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"글" | "댓글">("글");

  const myPosts = posts.slice(0, 3);

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="마이페이지" showNotification={false} />

      {/* Profile Card */}
      <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl overflow-hidden card-shadow">
        {/* Background gradient */}
        <div className="h-20 gradient-primary" />

        <div className="px-4 pb-5">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-4 border-white flex items-center justify-center text-3xl">
                👤
              </div>
              <button className="absolute bottom-0 right-0 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center press-effect">
                <Edit3 size={12} className="text-white" />
              </button>
            </div>
            <button className="h-8 px-3.5 border border-gray-200 rounded-xl text-[12px] text-gray-600 font-medium press-effect">
              프로필 수정
            </button>
          </div>

          {/* Name + Level */}
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold text-gray-900">{currentUser.nickname}</h2>
            <span className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-full",
              levelColors[currentUser.level]
            )}>
              {currentUser.level}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} className="text-gray-400" />
            <span className="text-[13px] text-gray-500">{currentUser.dong} 거주</span>
            <span className="text-gray-300 mx-1">·</span>
            <Calendar size={12} className="text-gray-400" />
            <span className="text-[13px] text-gray-500">
              {currentUser.joinedAt.slice(0, 7)} 가입
            </span>
          </div>

          {/* Level Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-500">레벨 진행도</span>
              <span className="text-[11px] font-semibold text-blue-600">
                {levelProgress[currentUser.level]}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all"
                style={{ width: `${levelProgress[currentUser.level]}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-0 mt-4 border border-gray-100 rounded-xl overflow-hidden">
            {[
              { label: "작성 글", value: currentUser.postCount },
              { label: "댓글", value: currentUser.commentCount },
              { label: "받은 좋아요", value: 142 },
            ].map((stat, idx, arr) => (
              <div
                key={stat.label}
                className={cn(
                  "flex-1 py-3 text-center",
                  idx !== arr.length - 1 && "border-r border-gray-100"
                )}
              >
                <p className="text-[18px] font-black text-gray-900">{stat.value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My Posts Preview */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden card-shadow">
        <div className="flex border-b border-gray-100">
          {(["글", "댓글"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 h-11 text-[13px] font-semibold press-effect border-b-2 transition-colors",
                activeTab === tab
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-400 border-transparent"
              )}
            >
              내가 쓴 {tab}
            </button>
          ))}
        </div>
        <div className="divide-y divide-gray-50">
          {myPosts.map((post) => (
            <div key={post.id} className="px-4 py-3 press-effect flex items-start gap-3">
              <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                {post.category}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">{post.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{post.createdAt.slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Groups */}
      {menuGroups.map((group) => (
        <div key={group.title} className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden card-shadow">
          <p className="px-4 pt-4 pb-2 text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
            {group.title}
          </p>
          <div className="divide-y divide-gray-50">
            {group.items.map(({ icon: Icon, label, badge, color }) => (
              <button
                key={label}
                className="w-full flex items-center px-4 py-3.5 press-effect"
              >
                <Icon size={18} className={cn(color, "mr-3 shrink-0")} />
                <span className="flex-1 text-[14px] text-gray-800 text-left">{label}</span>
                {badge !== null && (
                  <span className="bg-blue-50 text-blue-600 text-[12px] font-bold px-2 py-0.5 rounded-full mr-1.5">
                    {badge}
                  </span>
                )}
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div className="mx-4 mb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-12 bg-white rounded-2xl text-red-500 text-[14px] font-medium card-shadow press-effect"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>

      {/* App Version */}
      <p className="text-center text-[11px] text-gray-300 pb-4">
        검단 라이프 v1.0.0 · 문의: geumdan@life.kr
      </p>

      <BottomNav />
    </div>
  );
}
