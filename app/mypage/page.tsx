"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Star, FileText, MessageSquare, Tag, Bell, Shield, HelpCircle,
  LogOut, Settings, Gift, Zap, Trophy, CheckCircle2, Heart, Sparkles, Crown,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts } from "@/lib/mockData";
import {
  getUserProfile,
  getMyPostCount,
  getMyCommentCount,
  getDownloadedCoupons,
  getFavoriteBuses,
  getFavoriteStores,
  getFavoriteApts,
  getUserGameStats,
  completeMission,
  redeemReward,
  type UserProfile,
  type UserGameStats,
} from "@/lib/db/userdata";

const WEEKLY_LIKES_MAX = 10;

const MISSIONS = [
  { id: "m1", title: "글 작성하기", desc: "커뮤니티에 글 1개 작성", reward: 10, icon: "✍️" },
  { id: "m2", title: "좋아요 5번", desc: "이번 주 좋아요 5회 이상", reward: 10, icon: "❤️" },
  { id: "m3", title: "댓글 달기", desc: "댓글 2개 작성", reward: 6, icon: "💬" },
  { id: "m4", title: "7일 연속 방문", desc: "앱 7일 연속 접속", reward: 50, icon: "🔥" },
  { id: "m5", title: "부동산 조회", desc: "단지 상세 1회 열람", reward: 5, icon: "🏠" },
];

const REWARDS = [
  { id: "r1", title: "스타벅스 아메리카노 교환권", cost: 800, emoji: "☕", stock: 5 },
  { id: "r2", title: "맘스터치 할인쿠폰 500원", cost: 300, emoji: "🍔", stock: 10 },
  { id: "r3", title: "올리브영 1,000원 할인", cost: 500, emoji: "🛍️", stock: 8 },
  { id: "r4", title: "이디야 음료 무료", cost: 600, emoji: "☕", stock: 3 },
];

const LEVEL_THRESHOLDS: Record<string, number> = { 브론즈: 0, 실버: 500, 골드: 1500, 플래티넘: 3000 };
const LEVEL_ORDER = ["브론즈", "실버", "골드", "플래티넘"] as const;
type MonthlyLevel = typeof LEVEL_ORDER[number];

function getMonthlyLevel(monthlyPoints: number): MonthlyLevel {
  let level: MonthlyLevel = "브론즈";
  for (const l of LEVEL_ORDER) {
    if (monthlyPoints >= LEVEL_THRESHOLDS[l]) level = l;
  }
  return level;
}

function getNextLevel(level: MonthlyLevel): MonthlyLevel {
  const idx = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
}

const levelBadge: Record<string, string> = {
  새싹: "bg-[#D1FAE5] text-[#065F46]",
  주민: "bg-[#e8f1fd] text-[#1E40AF]",
  이웃: "bg-[#EDE9FE] text-[#5B21B6]",
  터줏대감: "bg-[#FEF3C7] text-[#92400E]",
};
const levelPct: Record<string, number> = { 새싹: 15, 주민: 40, 이웃: 65, 터줏대감: 100 };

const monthlyLevelColor: Record<string, { from: string; to: string; badge: string }> = {
  브론즈: { from: "#92400E", to: "#D97706", badge: "bg-[#FEF3C7] text-[#92400E]" },
  실버: { from: "#4B5563", to: "#9CA3AF", badge: "bg-[#F3F4F6] text-[#374151]" },
  골드: { from: "#B45309", to: "#FBBF24", badge: "bg-[#FEF9C3] text-[#854D0E]" },
  플래티넘: { from: "#1E40AF", to: "#38BDF8", badge: "bg-[#e8f1fd] text-[#1E40AF]" },
};

const DEFAULT_STATS: UserGameStats = {
  points: 0, weeklyLikes: 0, weeklyPosts: 0, monthlyPoints: 0,
  completedMissions: [], redeemedRewards: [], pointHistory: [],
};

// ─── 홈과 동일한 섹션 라벨 ───────────────────────────────────
function SectionLabel({
  label,
  badge,
  href,
  linkLabel = "전체보기",
}: {
  label: string;
  badge?: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-3">
      <div className="flex items-center gap-2">
        <span className="text-[19px] font-extrabold text-[#1d1d1f]">{label}</span>
        {badge}
      </div>
      {href && (
        <Link href={href} className="text-[13px] text-[#0071e3] font-medium flex items-center gap-0.5">
          {linkLabel} <ChevronRight size={13} />
        </Link>
      )}
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [showPointHistory, setShowPointHistory] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameStats, setGameStats] = useState<UserGameStats>(DEFAULT_STATS);
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [couponCount, setCouponCount] = useState(0);
  const [busCount, setBusCount] = useState(0);
  const [storeCount, setStoreCount] = useState(0);
  const [aptCount, setAptCount] = useState(0);

  useEffect(() => {
    getUserProfile().then(setProfile);
    getUserGameStats().then(setGameStats);
    getMyPostCount().then(setPostCount);
    getMyCommentCount().then(setCommentCount);
    getDownloadedCoupons().then(c => setCouponCount(c.length));
    getFavoriteBuses().then(b => setBusCount(b.length));
    getFavoriteStores().then(s => setStoreCount(s.length));
    getFavoriteApts().then(a => setAptCount(a.length));
  }, []);

  const monthlyLevel = getMonthlyLevel(gameStats.monthlyPoints);
  const nextLevel = getNextLevel(monthlyLevel);
  const mlv = monthlyLevelColor[monthlyLevel];
  const progressPct = Math.min(100, Math.round(
    (gameStats.monthlyPoints - LEVEL_THRESHOLDS[monthlyLevel]) /
    (LEVEL_THRESHOLDS[nextLevel] - LEVEL_THRESHOLDS[monthlyLevel]) * 100
  ));
  const remainToNext = LEVEL_THRESHOLDS[nextLevel] - gameStats.monthlyPoints;

  const nickname = profile?.nickname ?? "검단주민";
  const level = profile?.level ?? "새싹";
  const dong = profile?.dong ?? "당하동";
  const joinedAt = profile?.joined_at ?? new Date().toISOString().slice(0, 7);

  const missions = MISSIONS.map(m => ({
    ...m,
    done: gameStats.completedMissions.includes(m.id),
  }));

  async function handleRedeemConfirm(r: typeof REWARDS[number]) {
    await redeemReward(r.id, r.cost, r.title);
    setRedeemTarget(null);
    const updated = await getUserGameStats();
    setGameStats(updated);
  }

  const activityShortcuts = [
    { icon: FileText,      label: "내 글",     count: postCount,    color: "#0071e3", bg: "#e8f1fd", href: "/community/" },
    { icon: MessageSquare, label: "내 댓글",   count: commentCount, color: "#7C3AED", bg: "#F3F0FF", href: "/community/" },
    { icon: Heart,         label: "받은 좋아요", count: profile?.like_count ?? 0, color: "#F04452", bg: "#FFE4E6", href: null },
    { icon: Tag,           label: "쿠폰",      count: couponCount,  color: "#F59E0B", bg: "#FEF3C7", href: "/coupons/" },
  ];

  const favoriteShortcuts = [
    { icon: Star, label: "즐겨찾는 버스", badge: String(busCount),   color: "text-[#FBBF24]", href: "/transport/" },
    { icon: Star, label: "즐겨찾는 상가", badge: String(storeCount), color: "text-[#FBBF24]", href: "/stores/" },
    { icon: Star, label: "관심 아파트",   badge: String(aptCount),   color: "text-[#FBBF24]", href: "/community/?tab=시세" },
  ];

  const settingsShortcuts = [
    { icon: Bell,       label: "알림 설정",       href: "/mypage/notifications/" },
    { icon: Shield,     label: "개인정보 보호",   href: "/mypage/settings/" },
    { icon: Settings,   label: "앱 설정",         href: "/mypage/settings/" },
    { icon: HelpCircle, label: "고객센터 / 신고", href: null },
  ];

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="마이페이지" />

      {/* ── 인사 배너 ────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[12px] font-semibold text-[#86868b] mb-1 tracking-wide">
          {dong} · {joinedAt.slice(0, 7)} 가입 · {level}
        </p>
        <h1 className="text-[26px] font-black text-[#1d1d1f] leading-tight tracking-tight">
          {nickname}님, 오늘도 검단에서 빛나세요 ✨
        </h1>
      </div>

      {/* ── 프로필 히어로 카드 ──────────────────────────── */}
      <section className="mx-4 mb-1">
        <div className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "linear-gradient(135deg, #0071e3, #6366F1)" }}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-[28px] shrink-0">
                👤
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[18px] font-black text-white truncate">{nickname}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${levelBadge[level] ?? levelBadge["새싹"]}`}>
                    {level}
                  </span>
                </div>
                <p className="text-[12px] text-white/70 mt-0.5">레벨 진행도 {levelPct[level] ?? 15}%</p>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${levelPct[level] ?? 15}%` }} />
                </div>
              </div>
              <button onClick={() => router.push("/mypage/edit/")}
                className="h-8 px-3 bg-white/20 backdrop-blur-sm rounded-xl text-[12px] text-white font-semibold active:bg-white/30 shrink-0">
                프로필
              </button>
            </div>

            {/* 활동 통계 글래스 카드 3분할 */}
            <div className="flex mt-4 bg-white/15 backdrop-blur-sm rounded-xl overflow-hidden">
              {([["작성 글", postCount], ["댓글", commentCount], ["받은 좋아요", profile?.like_count ?? 0]] as [string, number][])
                .map(([l, v], i, arr) => (
                <div key={l} className={`flex-1 py-2.5 text-center ${i !== arr.length - 1 ? "border-r border-white/15" : ""}`}>
                  <p className="text-[19px] font-black text-white leading-tight">{v}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 빠른 활동 (뉴모피즘 그리드) ────────────────────── */}
      <SectionLabel label="내 활동" />
      <section className="px-5 mb-1">
        <div className="grid grid-cols-4 gap-x-4 gap-y-3">
          {activityShortcuts.map(({ icon: Icon, label, count, color, bg, href }) => (
            <button key={label} onClick={() => href && router.push(href)}
              disabled={!href}
              className="flex flex-col items-center gap-[7px] active:scale-95 transition-transform disabled:opacity-100">
              <div className="relative w-[52px] h-[52px] rounded-[16px] flex items-center justify-center"
                style={{ background: "#f5f5f7", boxShadow: "4px 4px 8px #cfd0d3, -4px -4px 8px #ffffff" }}>
                <div className="absolute inset-[3px] rounded-[13px] flex items-center justify-center"
                  style={{ background: bg }}>
                  <Icon size={20} strokeWidth={2.2} color={color} />
                </div>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#F04452] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#f5f5f7]">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-[#3c3c43] leading-none">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 포인트 & 월간 등급 (그라디언트 히어로) ────────── */}
      <SectionLabel
        label="포인트 & 등급"
        badge={<Crown size={15} className="text-[#F59E0B]" />}
      />
      <section className="mx-4 mb-1">
        <div className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: `linear-gradient(135deg, ${mlv.from}, ${mlv.to})` }}>
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy size={14} className="text-white/80" />
                  <span className="text-[12px] font-bold text-white/80 tracking-wide">이번 달 등급</span>
                </div>
                <span className="text-[28px] font-black text-white leading-tight">{monthlyLevel}</span>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-white/70">보유 포인트</p>
                <p className="text-[26px] font-black text-white leading-tight">{gameStats.points.toLocaleString()}P</p>
              </div>
            </div>

            {/* 월간 레벨 진행 바 */}
            <div className="mb-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-[12px] text-white/70 font-semibold">{monthlyLevel}</span>
                <span className="text-[12px] text-white/70">{nextLevel}까지 {remainToNext}P</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* 이번 주 활동 — 글래스 카드 */}
            <div className="flex gap-2.5">
              <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-white/70 font-semibold">이번 주 좋아요</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[18px] font-black text-white">{gameStats.weeklyLikes}</span>
                  <span className="text-[12px] text-white/60">/{WEEKLY_LIKES_MAX}</span>
                </div>
                <div className="h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, gameStats.weeklyLikes / WEEKLY_LIKES_MAX * 100)}%` }} />
                </div>
              </div>
              <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-white/70 font-semibold">이번 주 글</p>
                <span className="text-[18px] font-black text-white">{gameStats.weeklyPosts}개</span>
                <p className="text-[11px] text-white/60 mt-0.5">글 1개 = +10P</p>
              </div>
            </div>

            <button onClick={() => setShowPointHistory(s => !s)}
              className="mt-3 w-full text-center text-[12px] text-white/70 active:opacity-60 flex items-center justify-center gap-1">
              포인트 내역 {showPointHistory ? "▲" : "▼"}
            </button>
            {showPointHistory && (
              <div className="mt-2 bg-white/10 backdrop-blur-sm rounded-xl p-3 space-y-1.5">
                {gameStats.pointHistory.length === 0 ? (
                  <p className="text-[12px] text-white/60 text-center">포인트 내역이 없습니다</p>
                ) : gameStats.pointHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] text-white/80">{h.desc}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white/50">{h.date.slice(5)}</span>
                      <span className={`text-[13px] font-bold ${h.points > 0 ? "text-white" : "text-white/60"}`}>
                        {h.points > 0 ? "+" : ""}{h.points}P
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 주간 미션 ─────────────────────────────────────── */}
      <SectionLabel
        label="주간 미션"
        badge={<Zap size={15} className="text-[#F59E0B]" />}
      />
      <section className="mx-4 mb-1">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f0f0f0]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-[13px] font-semibold text-[#6e6e73]">
              완료 {missions.filter(m => m.done).length}/{missions.length}
            </span>
            <span className="text-[12px] text-[#0071e3] font-bold">
              +{missions.filter(m => m.done).reduce((s, m) => s + m.reward, 0)}P 달성
            </span>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {missions.map(m => (
              <div key={m.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 ${m.done ? "bg-[#F0FDF4]" : "bg-[#f5f5f7]"}`}>
                <span className="text-xl shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-bold ${m.done ? "text-[#065F46]" : "text-[#1d1d1f]"}`}>{m.title}</p>
                  <p className={`text-[12px] ${m.done ? "text-[#00C471]" : "text-[#6e6e73]"}`}>{m.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[13px] font-bold ${m.done ? "text-[#00C471]" : "text-[#F59E0B]"}`}>+{m.reward}P</span>
                  {m.done ? (
                    <CheckCircle2 size={16} className="text-[#00C471]" />
                  ) : (
                    <button
                      onClick={async () => {
                        await completeMission(m.id, m.reward, m.title);
                        setGameStats(await getUserGameStats());
                      }}
                      className="h-7 px-2.5 bg-[#F59E0B] rounded-xl text-[12px] font-bold text-white active:opacity-70">
                      완료
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 포인트 교환 ──────────────────────────────────── */}
      <SectionLabel
        label="포인트 교환"
        badge={<Gift size={15} className="text-[#0071e3]" />}
      />
      <section className="mx-4 mb-1">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f0f0f0]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-[13px] font-semibold text-[#6e6e73]">전체 {REWARDS.length}개 상품</span>
            <span className="text-[13px] font-bold text-[#0071e3]">{gameStats.points.toLocaleString()}P 보유</span>
          </div>
          <div className="px-4 pb-3 space-y-2">
            {REWARDS.map(r => {
              const done = gameStats.redeemedRewards.includes(r.id);
              const canRedeem = gameStats.points >= r.cost && !done;
              return (
                <div key={r.id} className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-3 py-3">
                  <span className="text-2xl shrink-0">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[13px] font-bold text-[#0071e3]">{r.cost}P</span>
                      <span className="text-[12px] text-[#6e6e73]">잔여 {r.stock}개</span>
                    </div>
                  </div>
                  {done ? (
                    <div className="flex items-center gap-1 bg-[#D1FAE5] px-3 py-1.5 rounded-xl shrink-0">
                      <CheckCircle2 size={13} className="text-[#00C471]" />
                      <span className="text-[12px] font-bold text-[#065F46]">교환완료</span>
                    </div>
                  ) : redeemTarget === r.id ? (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setRedeemTarget(null)}
                        className="h-8 px-2.5 bg-[#d2d2d7] rounded-xl text-[12px] font-bold text-[#424245] active:opacity-70">취소</button>
                      <button onClick={() => handleRedeemConfirm(r)}
                        className="h-8 px-2.5 bg-[#0071e3] rounded-xl text-[12px] font-bold text-white active:opacity-70">확인</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => canRedeem && setRedeemTarget(r.id)}
                      disabled={!canRedeem}
                      className={`h-8 px-3 rounded-xl text-[13px] font-bold transition-colors shrink-0 ${
                        canRedeem ? "bg-[#0071e3] text-white active:bg-[#0058b0]" : "bg-[#d2d2d7] text-[#86868b]"
                      }`}>
                      교환
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mx-4 mb-4 bg-[#e8f1fd] rounded-xl px-3 py-2.5 flex items-start gap-2">
            <Sparkles size={13} className="text-[#0071e3] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#0071e3] leading-relaxed">
              글 작성 <strong>+10P</strong> · 댓글 <strong>+3P</strong> · 좋아요 <strong>+2P</strong> (주 {WEEKLY_LIKES_MAX}회)
            </p>
          </div>
        </div>
      </section>

      {/* ── 최근 작성글 ───────────────────────────────────── */}
      <SectionLabel label="최근 작성글" href="/community/" linkLabel="전체보기" />
      <section className="mx-4 mb-1">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f0f0f0] divide-y divide-[#f5f5f7]">
          {posts.slice(0, 3).map(p => (
            <button key={p.id} onClick={() => router.push(`/community/detail/?id=${p.id}`)}
              className="w-full px-4 py-3 flex items-start gap-3 active:bg-[#f5f5f7] text-left">
              <span className="text-[11px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-0.5 rounded-full shrink-0 mt-0.5">{p.category}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                <p className="text-[12px] text-[#86868b] mt-0.5">{p.createdAt.slice(0, 10)} · ❤️ {p.likeCount}</p>
              </div>
              <ChevronRight size={14} className="text-[#d2d2d7] shrink-0 mt-1.5" />
            </button>
          ))}
        </div>
      </section>

      {/* ── 즐겨찾기 ─────────────────────────────────────── */}
      <SectionLabel label="즐겨찾기" />
      <section className="mx-4 mb-1">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f0f0f0] divide-y divide-[#f5f5f7]">
          {favoriteShortcuts.map(({ icon: Icon, label, badge, color, href }) => (
            <button key={label} onClick={() => href && router.push(href)}
              className="w-full flex items-center px-4 py-3.5 active:bg-[#f5f5f7] transition-colors">
              <Icon size={18} className={`${color} mr-3 shrink-0`} />
              <span className="flex-1 text-[15px] text-[#1d1d1f] text-left">{label}</span>
              {badge !== "0" && (
                <span className="bg-[#FEF3C7] text-[#92400E] text-[12px] font-bold px-2 py-0.5 rounded-full mr-2">{badge}</span>
              )}
              <ChevronRight size={16} className="text-[#d2d2d7]" />
            </button>
          ))}
        </div>
      </section>

      {/* ── 설정 ─────────────────────────────────────────── */}
      <SectionLabel label="설정" />
      <section className="mx-4 mb-1">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f0f0f0] divide-y divide-[#f5f5f7]">
          {settingsShortcuts.map(({ icon: Icon, label, href }) => (
            <button key={label} onClick={() => href && router.push(href)}
              className="w-full flex items-center px-4 py-3.5 active:bg-[#f5f5f7] transition-colors">
              <Icon size={18} className="text-[#6e6e73] mr-3 shrink-0" />
              <span className="flex-1 text-[15px] text-[#1d1d1f] text-left">{label}</span>
              <ChevronRight size={16} className="text-[#d2d2d7]" />
            </button>
          ))}
        </div>
      </section>

      {/* ── 로그아웃 ─────────────────────────────────────── */}
      <div className="mx-4 mt-6 mb-4">
        <button onClick={() => router.push("/login/")}
          className="w-full flex items-center justify-center gap-2 h-12 bg-white rounded-2xl border border-[#f0f0f0] shadow-sm text-[#F04452] text-[15px] font-semibold active:bg-[#FEE2E2] transition-colors">
          <LogOut size={16} />로그아웃
        </button>
      </div>

      <p className="text-center text-[12px] text-[#86868b] pb-4">검단 라이프 v1.1.0</p>
      <BottomNav />
    </div>
  );
}
