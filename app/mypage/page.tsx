"use client";
import { useRouter } from "next/navigation";
import { ChevronRight, Star, FileText, MessageSquare, Tag, Bell, Shield, HelpCircle, LogOut, Settings } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { currentUser, posts } from "@/lib/mockData";

const levelBadge: Record<string, string> = {
  새싹: "bg-[#D1FAE5] text-[#065F46]",
  주민: "bg-[#DBEAFE] text-[#1E40AF]",
  이웃: "bg-[#EDE9FE] text-[#5B21B6]",
  터줏대감: "bg-[#FEF3C7] text-[#92400E]",
};
const levelPct: Record<string, number> = { 새싹:15, 주민:40, 이웃:65, 터줏대감:100 };

const menuGroups = [
  {
    title: "내 활동",
    items: [
      { icon: FileText, label: "내가 쓴 글", badge: String(currentUser.postCount), color: "text-[#3182F6]", href: "/community/" },
      { icon: MessageSquare, label: "내가 쓴 댓글", badge: String(currentUser.commentCount), color: "text-[#8B5CF6]", href: "/community/" },
      { icon: Tag, label: "다운로드한 쿠폰", badge: "3", color: "text-[#F59E0B]", href: null },
    ],
  },
  {
    title: "즐겨찾기",
    items: [
      { icon: Star, label: "즐겨찾는 버스", badge: "2", color: "text-[#FBBF24]", href: "/transport/" },
      { icon: Star, label: "즐겨찾는 상가", badge: "5", color: "text-[#FBBF24]", href: "/stores/" },
      { icon: Star, label: "관심 아파트", badge: "3", color: "text-[#FBBF24]", href: "/real-estate/" },
    ],
  },
  {
    title: "설정",
    items: [
      { icon: Bell, label: "알림 설정", badge: null, color: "text-[#8B95A1]", href: "/mypage/notifications/" },
      { icon: Shield, label: "개인정보 보호", badge: null, color: "text-[#8B95A1]", href: "/mypage/settings/" },
      { icon: Settings, label: "앱 설정", badge: null, color: "text-[#8B95A1]", href: "/mypage/settings/" },
      { icon: HelpCircle, label: "고객센터 / 신고", badge: null, color: "text-[#8B95A1]", href: null },
    ],
  },
];

export default function MyPage() {
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="마이페이지" />

      {/* Profile Card */}
      <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <div className="h-16 bg-[#3182F6]" />
        <div className="px-4 pb-5">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="w-16 h-16 rounded-full bg-[#EBF3FE] border-4 border-white flex items-center justify-center text-2xl">👤</div>
            <button onClick={() => router.push("/mypage/edit/")} className="h-8 px-3.5 border border-[#E5E8EB] rounded-xl text-[12px] text-[#4E5968] font-medium active:bg-[#F2F4F6]">
              프로필 수정
            </button>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold text-[#191F28]">{currentUser.nickname}</h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${levelBadge[currentUser.level]}`}>
              {currentUser.level}
            </span>
          </div>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">{currentUser.dong} · {currentUser.joinedAt.slice(0,7)} 가입</p>

          {/* Level bar */}
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-[#8B95A1]">레벨 진행도</span>
              <span className="text-[11px] font-bold text-[#3182F6]">{levelPct[currentUser.level]}%</span>
            </div>
            <div className="h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
              <div className="h-full bg-[#3182F6] rounded-full" style={{ width: `${levelPct[currentUser.level]}%` }} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex mt-4 border border-[#F2F4F6] rounded-xl overflow-hidden">
            {[["작성 글", currentUser.postCount], ["댓글", currentUser.commentCount], ["받은 좋아요", 142]].map(([l, v], i, arr) => (
              <div key={String(l)} className={`flex-1 py-3 text-center ${i !== arr.length-1 ? "border-r border-[#F2F4F6]" : ""}`}>
                <p className="text-[20px] font-black text-[#191F28]">{v}</p>
                <p className="text-[11px] text-[#8B95A1] mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent posts */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-[13px] font-bold text-[#8B95A1]">최근 작성글</p>
        <div className="divide-y divide-[#F2F4F6]">
          {posts.slice(0,3).map(p => (
            <div key={p.id} className="px-4 py-3 flex items-start gap-3">
              <span className="text-[11px] font-bold bg-[#EBF3FE] text-[#3182F6] px-2 py-0.5 rounded-full shrink-0 mt-0.5">{p.category}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#191F28] truncate">{p.title}</p>
                <p className="text-[11px] text-[#B0B8C1] mt-0.5">{p.createdAt.slice(0,10)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      {menuGroups.map(g => (
        <div key={g.title} className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-1 text-[12px] font-bold text-[#8B95A1]">{g.title}</p>
          <div className="divide-y divide-[#F2F4F6]">
            {g.items.map(({ icon: Icon, label, badge, color, href }) => (
              <button key={label} onClick={() => href && router.push(href)} className="w-full flex items-center px-4 py-3.5 active:bg-[#F2F4F6] transition-colors">
                <Icon size={18} className={`${color} mr-3 shrink-0`} />
                <span className="flex-1 text-[14px] text-[#191F28] text-left">{label}</span>
                {badge && <span className="bg-[#EBF3FE] text-[#3182F6] text-[12px] font-bold px-2 py-0.5 rounded-full mr-2">{badge}</span>}
                <ChevronRight size={16} className="text-[#E5E8EB]" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div className="mx-4 mb-6">
        <button onClick={() => router.push("/login/")}
          className="w-full flex items-center justify-center gap-2 h-12 bg-white rounded-2xl text-[#F04452] text-[14px] font-medium active:bg-[#FEE2E2] transition-colors">
          <LogOut size={16} />로그아웃
        </button>
      </div>

      <p className="text-center text-[11px] text-[#B0B8C1] pb-4">검단 라이프 v1.0.0</p>
      <BottomNav />
    </div>
  );
}
