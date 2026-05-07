"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings, ChevronRight,
  FileText, MessageCircle, Heart,
  Building, Bus, Store, Newspaper, UserCog, Bell, LogOut,
} from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import {
  getUserProfile,
  getMyPageSummary,
  getAvatarUrl,
  type UserProfile,
  type MyPageSummary,
} from "@/lib/db/userdata";

const PRIMARY = "#2563EB";

const LEVEL_TO_NUM: Record<UserProfile["level"], number> = {
  새싹: 1, 주민: 2, 이웃: 3, 터줏대감: 4,
};

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<MyPageSummary>({ postCount: 0, commentCount: 0, favoriteCount: 0 });
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    getUserProfile().then(setProfile);
    getMyPageSummary().then(setSummary);
    setAvatar(getAvatarUrl());
  }, []);

  const handleLogout = () => {
    if (!confirm("로그아웃 하시겠어요?")) return;
    try {
      localStorage.removeItem("geumdan_uid");
      localStorage.removeItem("geumdan_profile");
    } catch { /* noop */ }
    router.push("/login/");
  };

  const nickname = profile?.nickname ?? "검단주민";
  const handle = profile?.id ? `@${profile.id.slice(0, 8)}` : "@guest";
  const lvNum = profile ? LEVEL_TO_NUM[profile.level] : 1;

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-32">
      {/* 상단바: 설정 아이콘만 우상단 */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-[52px] px-4">
          <h1 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight">마이페이지</h1>
          <Link
            href="/mypage/settings/"
            aria-label="설정"
            className="active:opacity-50 transition-opacity"
          >
            <Settings size={22} className="text-[#1d1d1f]" />
          </Link>
        </div>
      </header>

      {/* 프로필 행 */}
      <section className="px-5 pt-4 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#e8f1fd] overflow-hidden flex items-center justify-center text-3xl shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>👤</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold text-[#1d1d1f] truncate">{nickname}</span>
              <span className="shrink-0 text-[11px] font-bold bg-[#FFF3E0] text-[#E8741C] px-2 py-[2px] rounded-full">
                활동 Lv.{lvNum}
              </span>
            </div>
            <p className="text-[13px] text-[#86868b] truncate mt-0.5">{handle}</p>
          </div>
          <Link
            href="/mypage/profile/"
            className="h-8 px-3 rounded-full bg-[#f0f0f3] text-[12px] font-semibold text-[#424245] active:opacity-70 transition-opacity flex items-center"
          >
            편집
          </Link>
        </div>
      </section>

      {/* 활동 요약 — 파란 카드 */}
      <section className="px-5">
        <div
          className="rounded-3xl p-5 shadow-[0_6px_20px_rgba(37,99,235,0.18)]"
          style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #4F46E5 100%)` }}
        >
          <p className="text-[13px] font-medium text-white/85">내 활동 요약</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryBlock label="내가 쓴 글" value={summary.postCount} href="/mypage/posts/" />
            <SummaryBlock label="즐겨찾기" value={summary.favoriteCount} href="/mypage/favorites/" />
            <SummaryBlock label="댓글" value={summary.commentCount} href="/mypage/comments/" />
          </div>
        </div>
      </section>

      {/* 내 활동 리스트 */}
      <section className="mt-7 px-5">
        <p className="text-[13px] font-bold text-[#86868b] mb-3 px-1">내 활동</p>
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <ListRow icon={<FileText size={18} className="text-[#2563EB]" />} title="내가 쓴 글" sub={`${summary.postCount}개`} href="/mypage/posts/" />
          <Divider />
          <ListRow icon={<MessageCircle size={18} className="text-[#10B981]" />} title="내 댓글" sub={`${summary.commentCount}개`} href="/mypage/comments/" />
          <Divider />
          <ListRow icon={<Heart size={18} className="text-[#F04452]" />} title="즐겨찾기" sub={`${summary.favoriteCount}개 (장소·상가·교통)`} href="/mypage/favorites/" />
        </div>
      </section>

      {/* 추천 메뉴 — 2컬럼 그리드 */}
      <section className="mt-7 px-5">
        <p className="text-[13px] font-bold text-[#86868b] mb-3 px-1">바로가기</p>
        <div className="grid grid-cols-2 gap-3">
          <GridCard icon={<Building size={22} className="text-[#2563EB]" />} title="부동산 시세" sub="검단 아파트 시세" href="/community/?tab=시세" />
          <GridCard icon={<Bus size={22} className="text-[#10B981]" />} title="교통 즐겨찾기" sub="자주 타는 노선" href="/mypage/favorites/?tab=bus" />
          <GridCard icon={<Store size={22} className="text-[#F59E0B]" />} title="즐겨찾기 상가" sub="찜한 매장" href="/mypage/favorites/?tab=store" />
          <GridCard icon={<Newspaper size={22} className="text-[#8B5CF6]" />} title="관심 소식" sub="검단 뉴스/소식" href="/news/" />
          <GridCard icon={<UserCog size={22} className="text-[#0EA5E9]" />} title="프로필 수정" sub="닉네임·아바타" href="/mypage/profile/" />
          <GridCard icon={<Bell size={22} className="text-[#EF4444]" />} title="알림 설정" sub="푸시 on/off" href="/mypage/notifications/" />
        </div>
      </section>

      {/* 설정/로그아웃 */}
      <section className="mt-7 px-5">
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <ListRow icon={<Settings size={18} className="text-[#6e6e73]" />} title="설정" sub="앱 환경설정" href="/mypage/settings/" />
          <Divider />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-[#f5f5f7] transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-[#FEE2E2] flex items-center justify-center">
              <LogOut size={18} className="text-[#EF4444]" />
            </span>
            <span className="flex-1 text-[15px] font-semibold text-[#EF4444]">로그아웃</span>
            <ChevronRight size={18} className="text-[#c7c7cc]" />
          </button>
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

function SummaryBlock({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center rounded-2xl bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors py-3"
    >
      <span className="text-[22px] font-extrabold text-white tracking-tight leading-none">{value}</span>
      <span className="mt-1.5 text-[11px] font-medium text-white/85">{label}</span>
    </Link>
  );
}

function ListRow({ icon, title, sub, href }: { icon: React.ReactNode; title: string; sub?: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-4 active:bg-[#f5f5f7] transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-[#f5f5f7] flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#1d1d1f]">{title}</p>
        {sub && <p className="text-[12px] text-[#86868b] mt-0.5">{sub}</p>}
      </div>
      <ChevronRight size={18} className="text-[#c7c7cc]" />
    </Link>
  );
}

function Divider() {
  return <div className="h-px bg-[#f0f0f3] mx-4" />;
}

function GridCard({ icon, title, sub, href }: { icon: React.ReactNode; title: string; sub: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:bg-[#f5f5f7] transition-colors"
    >
      <span className="inline-flex w-10 h-10 rounded-xl bg-[#f5f5f7] items-center justify-center">
        {icon}
      </span>
      <p className="mt-3 text-[15px] font-bold text-[#1d1d1f]">{title}</p>
      <p className="text-[12px] text-[#86868b] mt-0.5">{sub}</p>
    </Link>
  );
}
