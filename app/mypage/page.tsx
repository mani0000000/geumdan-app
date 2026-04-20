"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Star, FileText, MessageSquare, Tag, Bell, Shield, HelpCircle, LogOut, Settings, Gift, Zap, Trophy, CheckCircle2 } from "lucide-react";
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

  const menuGroups = [
    {
      title: "내 활동",
      items: [
        { icon: FileText, label: "내가 쓴 글", badge: String(postCount), color: "text-[#0071e3]", href: "/community/" },
        { icon: MessageSquare, label: "내가 쓴 댓글", badge: String(commentCount), color: "text-[#8B5CF6]", href: "/community/" },
        { icon: Tag, label: "다운로드한 쿠폰", badge: String(couponCount), color: "text-[#F59E0B]", href: null },
      ],
    },
    {
      title: "즐겨찾기",
      items: [
        { icon: Star, label: "즐겨찾는 버스", badge: String(busCount), color: "text-[#FBBF24]", href: "/transport/" },
        { icon: Star, label: "즐겨찾는 상가", badge: String(storeCount), color: "text-[#FBBF24]", href: "/stores/" },
        { icon: Star, label: "관심 아파트", badge: String(aptCount), color: "text-[#FBBF24]", href: "/real-estate/" },
      ],
    },
    {
      title: "설정",
      items: [
        { icon: Bell, label: "알림 설정", badge: null, color: "text-[#6e6e73]", href: "/mypage/notifications/" },
        { icon: Shield, label: "개인정보 보호", badge: null, color: "text-[#6e6e73]", href: "/mypage/settings/" },
        { icon: Settings, label: "앱 설정", badge: null, color: "text-[#6e6e73]", href: "/mypage/settings/" },
        { icon: HelpCircle, label: "고객센터 / 신고", badge: null, color: "text-[#6e6e73]", href: null },
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-20">
      <Header title="마이페이지" />

      {/* 프로필 카드 */}
      <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <div className="h-16 bg-[#0071e3]" />
        <div className="px-4 pb-5">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="w-16 h-16 rounded-full bg-[#e8f1fd] border-4 border-white flex items-center justify-center text-2xl">👤</div>
            <button onClick={() => router.push("/mypage/edit/")}
              className="h-8 px-3.5 border border-[#d2d2d7] rounded-xl text-[13px] text-[#424245] font-medium active:bg-[#f5f5f7]">
              프로필 수정
            </button>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-[19px] font-bold text-[#1d1d1f]">{nickname}</h2>
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${levelBadge[level] ?? levelBadge["새싹"]}`}>
              {level}
            </span>
          </div>
          <p className="text-[14px] text-[#6e6e73] mt-0.5">{dong} · {joinedAt.slice(0, 7)} 가입</p>
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-[#6e6e73]">레벨 진행도</span>
              <span className="text-[12px] font-bold text-[#0071e3]">{levelPct[level] ?? 15}%</span>
            </div>
            <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
              <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${levelPct[level] ?? 15}%` }} />
            </div>
          </div>
          <div className="flex mt-4 border border-[#f5f5f7] rounded-xl overflow-hidden">
            {([["작성 글", postCount], ["댓글", commentCount], ["받은 좋아요", profile?.like_count ?? 0]] as [string, number][]).map(([l, v], i, arr) => (
              <div key={l} className={`flex-1 py-3 text-center ${i !== arr.length - 1 ? "border-r border-[#f5f5f7]" : ""}`}>
                <p className="text-[21px] font-black text-[#1d1d1f]">{v}</p>
                <p className="text-[12px] text-[#6e6e73] mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 포인트 & 월간 레벨 카드 ── */}
      <div className="mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${mlv.from}, ${mlv.to})` }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={16} className="text-white/80" />
                <span className="text-[14px] font-bold text-white/80">이번 달 등급</span>
              </div>
              <span className="text-[29px] font-black text-white">{monthlyLevel}</span>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-white/70">보유 포인트</p>
              <p className="text-[27px] font-black text-white">{gameStats.points.toLocaleString()}P</p>
            </div>
          </div>

          {/* 월간 레벨 진행 바 */}
          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[12px] text-white/70">{monthlyLevel}</span>
              <span className="text-[12px] text-white/70">{nextLevel} (앞으로 {remainToNext}P)</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* 이번 주 활동 */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white/15 rounded-xl px-3 py-2.5">
              <p className="text-[12px] text-white/70">이번 주 좋아요</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[19px] font-black text-white">{gameStats.weeklyLikes}</span>
                <span className="text-[13px] text-white/60">/{WEEKLY_LIKES_MAX}</span>
              </div>
              <div className="h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, gameStats.weeklyLikes / WEEKLY_LIKES_MAX * 100)}%` }} />
              </div>
            </div>
            <div className="flex-1 bg-white/15 rounded-xl px-3 py-2.5">
              <p className="text-[12px] text-white/70">이번 주 글</p>
              <span className="text-[19px] font-black text-white">{gameStats.weeklyPosts}개</span>
              <p className="text-[12px] text-white/60 mt-0.5">글 1개 = +10P</p>
            </div>
          </div>

          <button onClick={() => setShowPointHistory(s => !s)}
            className="mt-3 w-full text-center text-[13px] text-white/70 active:opacity-60 flex items-center justify-center gap-1">
            포인트 내역 {showPointHistory ? "▲" : "▼"}
          </button>
          {showPointHistory && (
            <div className="mt-2 bg-white/10 rounded-xl p-3 space-y-1.5">
              {gameStats.pointHistory.length === 0 ? (
                <p className="text-[13px] text-white/60 text-center">포인트 내역이 없습니다</p>
              ) : gameStats.pointHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px] text-white/80">{h.desc}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-white/50">{h.date.slice(5)}</span>
                    <span className={`text-[14px] font-bold ${h.points > 0 ? "text-white" : "text-white/60"}`}>
                      {h.points > 0 ? "+" : ""}{h.points}P
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 주간 미션 ── */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-1.5">
            <Zap size={16} className="text-[#F59E0B]" />
            <span className="text-[16px] font-bold text-[#1d1d1f]">주간 미션</span>
          </div>
          <span className="text-[13px] text-[#6e6e73]">
            {missions.filter(m => m.done).length}/{missions.length} 완료
          </span>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {missions.map(m => (
            <div key={m.id} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${m.done ? "bg-[#F0FDF4]" : "bg-[#f5f5f7]"}`}>
              <span className="text-xl">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-bold ${m.done ? "text-[#065F46]" : "text-[#1d1d1f]"}`}>{m.title}</p>
                <p className={`text-[12px] ${m.done ? "text-[#00C471]" : "text-[#6e6e73]"}`}>{m.desc}</p>
              </div>
              <div className="flex items-center gap-1.5">
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

      {/* ── 포인트 교환 ── */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-1.5">
            <Gift size={16} className="text-[#0071e3]" />
            <span className="text-[16px] font-bold text-[#1d1d1f]">포인트 교환</span>
          </div>
          <span className="text-[13px] font-bold text-[#0071e3]">{gameStats.points.toLocaleString()}P 보유</span>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {REWARDS.map(r => {
            const done = gameStats.redeemedRewards.includes(r.id);
            const canRedeem = gameStats.points >= r.cost && !done;
            return (
              <div key={r.id} className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-3 py-3">
                <span className="text-2xl">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[13px] font-bold text-[#0071e3]">{r.cost}P</span>
                    <span className="text-[12px] text-[#6e6e73]">잔여 {r.stock}개</span>
                  </div>
                </div>
                {done ? (
                  <div className="flex items-center gap-1 bg-[#D1FAE5] px-3 py-1.5 rounded-xl">
                    <CheckCircle2 size={13} className="text-[#00C471]" />
                    <span className="text-[12px] font-bold text-[#065F46]">교환완료</span>
                  </div>
                ) : redeemTarget === r.id ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => setRedeemTarget(null)}
                      className="h-8 px-2.5 bg-[#d2d2d7] rounded-xl text-[12px] font-bold text-[#424245] active:opacity-70">취소</button>
                    <button onClick={() => handleRedeemConfirm(r)}
                      className="h-8 px-2.5 bg-[#0071e3] rounded-xl text-[12px] font-bold text-white active:opacity-70">확인</button>
                  </div>
                ) : (
                  <button
                    onClick={() => canRedeem && setRedeemTarget(r.id)}
                    disabled={!canRedeem}
                    className={`h-8 px-3 rounded-xl text-[13px] font-bold transition-colors ${
                      canRedeem ? "bg-[#0071e3] text-white active:bg-[#0058b0]" : "bg-[#d2d2d7] text-[#86868b]"
                    }`}>
                    교환
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mx-4 mb-4 bg-[#e8f1fd] rounded-xl px-3 py-2.5">
          <p className="text-[13px] text-[#0071e3] leading-relaxed">
            💡 글 작성 <strong>+10P</strong> · 댓글 <strong>+3P</strong> · 좋아요 <strong>+2P</strong> (주 {WEEKLY_LIKES_MAX}회)
          </p>
        </div>
      </div>

      {/* 최근 작성글 */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-[14px] font-bold text-[#6e6e73]">최근 작성글</p>
        <div className="divide-y divide-[#f5f5f7]">
          {posts.slice(0, 3).map(p => (
            <button key={p.id} onClick={() => router.push(`/community/detail/?id=${p.id}`)}
              className="w-full px-4 py-3 flex items-start gap-3 active:bg-[#f5f5f7] text-left">
              <span className="text-[12px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-0.5 rounded-full shrink-0 mt-0.5">{p.category}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                <p className="text-[12px] text-[#86868b] mt-0.5">{p.createdAt.slice(0, 10)} · ❤️ {p.likeCount}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 메뉴 */}
      {menuGroups.map(grp => (
        <div key={grp.title} className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-1 text-[13px] font-bold text-[#6e6e73]">{grp.title}</p>
          <div className="divide-y divide-[#f5f5f7]">
            {grp.items.map(({ icon: Icon, label, badge, color, href }) => (
              <button key={label} onClick={() => href && router.push(href)}
                className="w-full flex items-center px-4 py-3.5 active:bg-[#f5f5f7] transition-colors">
                <Icon size={18} className={`${color} mr-3 shrink-0`} />
                <span className="flex-1 text-[15px] text-[#1d1d1f] text-left">{label}</span>
                {badge !== null && badge !== "0" && (
                  <span className="bg-[#e8f1fd] text-[#0071e3] text-[13px] font-bold px-2 py-0.5 rounded-full mr-2">{badge}</span>
                )}
                <ChevronRight size={16} className="text-[#d2d2d7]" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* 로그아웃 */}
      <div className="mx-4 mb-6">
        <button onClick={() => router.push("/login/")}
          className="w-full flex items-center justify-center gap-2 h-12 bg-white rounded-2xl text-[#F04452] text-[15px] font-medium active:bg-[#FEE2E2] transition-colors">
          <LogOut size={16} />로그아웃
        </button>
      </div>

      <p className="text-center text-[12px] text-[#86868b] pb-4">검단 라이프 v1.1.0</p>
      <BottomNav />
    </div>
  );
}
