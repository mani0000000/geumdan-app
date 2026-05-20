"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Star, FileText, MessageSquare, Tag, Bell, Shield, HelpCircle, LogOut, Settings, Gift, Zap, Trophy, CheckCircle2, Bookmark, ScrollText } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import Avatar from "@/components/ui/Avatar";
import {
  getUserProfile,
  getMyPostCount,
  getMyCommentCount,
  getDownloadedCoupons,
  getFavoriteBuses,
  getFavoriteStores,
  getFavoriteApts,
  getFavoritePosts,
  getUserGameStats,
  getUserActivityStats,
  completeMission,
  type UserProfile,
  type UserGameStats,
  type ActivityStats,
} from "@/lib/db/userdata";
import {
  getMembershipGrades,
  resolveGrade,
  getExchangeableCoupons,
  getMyCoupons,
  exchangeCoupon,
  useMyCoupon,
  grantDailyLoginPoints,
  DEFAULT_GRADES,
  type MembershipGrade,
  type ExchangeCoupon,
  type MyCoupon,
} from "@/lib/db/membership";

const WEEKLY_LIKES_MAX = 10;

const MISSIONS = [
  { id: "m1", title: "글 작성하기", desc: "커뮤니티에 글 1개 작성", reward: 10, icon: "✍️" },
  { id: "m2", title: "좋아요 5번", desc: "이번 주 좋아요 5회 이상", reward: 10, icon: "❤️" },
  { id: "m3", title: "댓글 달기", desc: "댓글 2개 작성", reward: 6, icon: "💬" },
  { id: "m4", title: "7일 연속 방문", desc: "앱 7일 연속 접속", reward: 50, icon: "🔥" },
  { id: "m5", title: "부동산 조회", desc: "단지 상세 1회 열람", reward: 5, icon: "🏠" },
];

const levelBadge: Record<string, string> = {
  씨앗: "bg-[#F5F5F4] text-[#57534E]",
  새싹: "bg-[#D1FAE5] text-[#065F46]",
  주민: "bg-[#e8f1fd] text-[#1E40AF]",
  이웃: "bg-[#EDE9FE] text-[#5B21B6]",
  터줏대감: "bg-[#FEF3C7] text-[#92400E]",
};

// 등급명 → 카드 포인트 색상 (DB 등급명이 달라도 순서로 폴백)
const GRADE_COLORS: Record<string, { accent: string; soft: string }> = {
  "검단 새내기": { accent: "#00C471", soft: "#F0FDF4" },
  "검단 단골": { accent: "#0071e3", soft: "#e8f1fd" },
  "검단 일꾼": { accent: "#7C3AED", soft: "#EDE9FE" },
  "검단 지킴이": { accent: "#D97706", soft: "#FEF3C7" },
};
const GRADE_FALLBACK = [
  { accent: "#00C471", soft: "#F0FDF4" },
  { accent: "#0071e3", soft: "#e8f1fd" },
  { accent: "#7C3AED", soft: "#EDE9FE" },
  { accent: "#D97706", soft: "#FEF3C7" },
];
function gradeColor(name: string, order: number) {
  return GRADE_COLORS[name] ?? GRADE_FALLBACK[Math.min(order, GRADE_FALLBACK.length - 1)];
}

const DEFAULT_STATS: UserGameStats = {
  points: 0, weeklyLikes: 0, weeklyPosts: 0, monthlyPoints: 0,
  completedMissions: [], redeemedRewards: [], pointHistory: [],
};

const DEFAULT_ACTIVITY: ActivityStats = {
  postCount: 0, commentCount: 0, receivedLikes: 0,
  score: 0, level: "씨앗", levelPct: 0,
  nextLevel: "새싹", remainToNext: 50,
  weeklyPosts: 0, weeklyComments: 0, weeklyLikesReceived: 0,
};

const CARD = "bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100";

function SectionLabel({
  label,
  icon,
  right,
  onClick,
  linkLabel = "전체보기",
}: {
  label: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[19px] font-extrabold text-[#1d1d1f]">{label}</span>
      </div>
      {onClick ? (
        <button
          onClick={onClick}
          className="text-[13px] text-[#0071e3] font-medium flex items-center gap-0.5 active:opacity-60">
          {linkLabel} <ChevronRight size={13} />
        </button>
      ) : right}
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [showPointHistory, setShowPointHistory] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<string | null>(null);
  const [exchangeMsg, setExchangeMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameStats, setGameStats] = useState<UserGameStats>(DEFAULT_STATS);
  const [activity, setActivity] = useState<ActivityStats>(DEFAULT_ACTIVITY);
  const [grades, setGrades] = useState<MembershipGrade[]>(DEFAULT_GRADES);
  const [exchangeCoupons, setExchangeCoupons] = useState<ExchangeCoupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<MyCoupon[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [couponCount, setCouponCount] = useState(0);
  const [busCount, setBusCount] = useState(0);
  const [storeCount, setStoreCount] = useState(0);
  const [aptCount, setAptCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    getUserProfile().then(setProfile);
    getUserActivityStats().then(setActivity);
    getMembershipGrades().then(setGrades);
    getExchangeableCoupons().then(setExchangeCoupons);
    getMyCoupons().then(setMyCoupons);
    getMyPostCount().then(setPostCount);
    getMyCommentCount().then(setCommentCount);
    getDownloadedCoupons().then(c => setCouponCount(c.length));
    getFavoriteBuses().then(b => setBusCount(b.length));
    getFavoriteStores().then(s => setStoreCount(s.length));
    getFavoriteApts().then(a => setAptCount(a.length));
    getFavoritePosts().then(p => setSavedCount(p.length));
    // 출석(로그인) 활동 포인트 → 적립 시 통계 갱신
    grantDailyLoginPoints()
      .then(() => getUserGameStats())
      .then(setGameStats);
  }, []);

  const grade = resolveGrade(grades, gameStats.points);
  const mlv = gradeColor(grade.current.name, grade.current.sort_order);
  const progressPct = grade.progressPct;
  const remainToNext = grade.remainToNext;

  const nickname = profile?.nickname ?? "검단주민";
  const level = activity.level;
  const dong = profile?.dong ?? "당하동";
  const joinedAt = profile?.joined_at ?? new Date().toISOString().slice(0, 7);

  // 주간 미션: 명시적 완료 기록 OR 이번 주 실제 활동 충족 시 완료 처리
  const autoMissionDone: Record<string, boolean> = {
    m1: activity.weeklyPosts >= 1,
    m2: activity.weeklyLikesReceived >= 5,
    m3: activity.weeklyComments >= 2,
  };
  const missions = MISSIONS.map(m => ({
    ...m,
    done: gameStats.completedMissions.includes(m.id) || Boolean(autoMissionDone[m.id]),
  }));

  const myCouponIds = new Set(myCoupons.map(c => c.coupon_id));

  async function handleExchangeConfirm(c: ExchangeCoupon) {
    const res = await exchangeCoupon(c, gameStats.points);
    setRedeemTarget(null);
    if (!res.ok) {
      setExchangeMsg(res.error ?? "교환에 실패했습니다.");
      return;
    }
    setExchangeMsg(`'${c.title}' 쿠폰을 받았어요! 내 쿠폰함에서 확인하세요.`);
    const [stats, mine] = await Promise.all([getUserGameStats(), getMyCoupons()]);
    setGameStats(stats);
    setMyCoupons(mine);
  }

  async function handleUseCoupon(row: MyCoupon) {
    if (!confirm(`'${row.title}' 쿠폰을 사용 완료 처리할까요?`)) return;
    await useMyCoupon(row.id);
    setMyCoupons(await getMyCoupons());
  }

  const menuGroups = [
    {
      title: "내 활동",
      items: [
        { icon: FileText, label: "내가 쓴 글", badge: String(postCount), color: "text-[#0071e3]", href: "/mypage/posts/" },
        { icon: MessageSquare, label: "내가 쓴 댓글", badge: String(commentCount), color: "text-[#8B5CF6]", href: "/community/" },
        { icon: Bookmark, label: "저장한 글", badge: String(savedCount), color: "text-[#10B981]", href: "/mypage/saved/" },
        { icon: Tag, label: "다운로드한 쿠폰", badge: String(couponCount), color: "text-[#F59E0B]", href: null },
      ],
    },
    {
      title: "즐겨찾기",
      items: [
        { icon: Star, label: "즐겨찾는 버스", badge: String(busCount), color: "text-[#FBBF24]", href: "/transport/" },
        { icon: Star, label: "즐겨찾는 상가", badge: String(storeCount), color: "text-[#FBBF24]", href: "/stores/" },
        { icon: Star, label: "관심 아파트", badge: String(aptCount), color: "text-[#FBBF24]", href: "/community/?tab=시세" },
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
    {
      title: "약관 및 정책",
      items: [
        { icon: ScrollText, label: "약관 전체 보기", badge: null, color: "text-[#6e6e73]", href: "/mypage/terms/" },
        { icon: ScrollText, label: "서비스 이용약관", badge: null, color: "text-[#6e6e73]", href: "/terms/service/" },
        { icon: ScrollText, label: "개인정보처리방침", badge: null, color: "text-[#6e6e73]", href: "/terms/privacy/" },
        { icon: ScrollText, label: "위치기반 서비스 이용약관", badge: null, color: "text-[#6e6e73]", href: "/terms/location/" },
        { icon: ScrollText, label: "마케팅 정보 수신 동의", badge: null, color: "text-[#6e6e73]", href: "/terms/marketing/" },
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="마이페이지" />

      {/* 프로필 카드 */}
      <div className={`mx-4 mt-4 ${CARD}`}>
        <div className="px-4 pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Avatar src={profile?.avatar_url} size={64} alt={nickname} className="shrink-0" />
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-extrabold text-[#1d1d1f] truncate">{nickname}</h2>
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full shrink-0 ${levelBadge[level] ?? levelBadge["새싹"]}`}>
                  {level}
                </span>
              </div>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">{dong} · {joinedAt.slice(0, 7)} 가입</p>
            </div>
            <button onClick={() => router.push("/mypage/edit/")}
              className="h-8 px-3.5 border border-[#d2d2d7] rounded-full text-[13px] text-[#424245] font-semibold active:bg-[#f5f5f7] shrink-0">
              프로필 수정
            </button>
          </div>
          <div className="mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[12px] text-[#6e6e73]">
                활동 점수 <span className="font-bold text-[#1d1d1f]">{activity.score.toLocaleString()}</span>
                {activity.nextLevel && (
                  <span className="text-[#86868b]"> · {activity.nextLevel}까지 {activity.remainToNext.toLocaleString()}점</span>
                )}
              </span>
              <span className="text-[12px] font-bold text-[#0071e3]">{activity.levelPct}%</span>
            </div>
            <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
              <div className="h-full bg-[#0071e3] rounded-full transition-all" style={{ width: `${activity.levelPct}%` }} />
            </div>
          </div>
          <div className="flex mt-4 bg-[#f5f5f7] rounded-xl overflow-hidden">
            {([["작성 글", activity.postCount || postCount], ["댓글", activity.commentCount || commentCount], ["받은 좋아요", activity.receivedLikes]] as [string, number][]).map(([l, v], i, arr) => (
              <div key={l} className={`flex-1 py-3 text-center ${i !== arr.length - 1 ? "border-r border-white" : ""}`}>
                <p className="text-[21px] font-black text-[#1d1d1f]">{v}</p>
                <p className="text-[12px] text-[#6e6e73] mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 멤버십 등급 & 포인트 카드 ── */}
      <div className={`mx-4 mt-3 ${CARD}`}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy size={15} style={{ color: mlv.accent }} />
                <span className="text-[13px] font-medium text-[#6e6e73]">멤버십 등급</span>
              </div>
              <span className="inline-block text-[15px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: mlv.soft, color: mlv.accent }}>
                {grade.current.name}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-[#6e6e73]">보유 포인트</p>
              <p className="text-[24px] font-black text-[#1d1d1f]">{gameStats.points.toLocaleString()}P</p>
            </div>
          </div>

          {grade.current.benefits && (
            <p className="text-[12px] text-[#6e6e73] mb-3 leading-relaxed">🎁 {grade.current.benefits}</p>
          )}

          {/* 등급 진행 바 */}
          <div className="mb-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[12px] text-[#6e6e73]">{grade.current.name}</span>
              <span className="text-[12px] text-[#86868b]">
                {grade.next ? `${grade.next.name}까지 ${remainToNext.toLocaleString()}P` : "최고 등급 달성 🎉"}
              </span>
            </div>
            <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, background: mlv.accent }} />
            </div>
          </div>

          {/* 이번 주 활동 */}
          <div className="flex gap-2.5">
            <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2.5">
              <p className="text-[12px] text-[#6e6e73]">이번 주 좋아요</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[18px] font-black text-[#1d1d1f]">{gameStats.weeklyLikes}</span>
                <span className="text-[13px] text-[#86868b]">/{WEEKLY_LIKES_MAX}</span>
              </div>
              <div className="h-1 bg-[#e5e5ea] rounded-full mt-1.5 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, gameStats.weeklyLikes / WEEKLY_LIKES_MAX * 100)}%`, background: mlv.accent }} />
              </div>
            </div>
            <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2.5">
              <p className="text-[12px] text-[#6e6e73]">이번 주 글</p>
              <span className="text-[18px] font-black text-[#1d1d1f]">{gameStats.weeklyPosts}개</span>
              <p className="text-[12px] text-[#86868b] mt-0.5">글 1개 = +10P</p>
            </div>
          </div>

          <button onClick={() => setShowPointHistory(s => !s)}
            className="mt-3 w-full text-center text-[13px] text-[#6e6e73] active:opacity-60 flex items-center justify-center gap-1">
            포인트 내역 {showPointHistory ? "▲" : "▼"}
          </button>
          {showPointHistory && (
            <div className="mt-2 bg-[#f5f5f7] rounded-xl p-3 space-y-1.5">
              {gameStats.pointHistory.length === 0 ? (
                <p className="text-[13px] text-[#86868b] text-center">포인트 내역이 없습니다</p>
              ) : gameStats.pointHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#1d1d1f]">{h.desc}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#86868b]">{h.date.slice(5)}</span>
                    <span className={`text-[14px] font-bold ${h.points > 0 ? "text-[#00C471]" : "text-[#86868b]"}`}>
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
      <SectionLabel
        label="주간 미션"
        icon={<Zap size={18} className="text-[#F59E0B]" />}
        right={
          <span className="text-[13px] font-semibold text-[#6e6e73]">
            {missions.filter(m => m.done).length}/{missions.length} 완료
          </span>
        }
      />
      <div className={`mx-4 ${CARD}`}>
        <div className="p-3 space-y-2">
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

      {/* ── 포인트 교환 (DB store_coupons.required_points) ── */}
      <SectionLabel
        label="포인트 교환"
        icon={<Gift size={18} className="text-[#0071e3]" />}
        right={<span className="text-[13px] font-bold text-[#0071e3]">{gameStats.points.toLocaleString()}P 보유</span>}
      />
      <div className={`mx-4 ${CARD}`}>
        {exchangeMsg && (
          <div className="mx-3 mt-3 bg-[#e8f1fd] rounded-xl px-3 py-2.5 flex items-start justify-between gap-2">
            <p className="text-[13px] text-[#0071e3] leading-relaxed">{exchangeMsg}</p>
            <button onClick={() => setExchangeMsg(null)} className="text-[#0071e3] text-[12px] font-bold shrink-0">닫기</button>
          </div>
        )}

        <div className="p-3 space-y-2">
          {exchangeCoupons.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[14px] text-[#6e6e73]">교환 가능한 쿠폰이 없습니다</p>
              <p className="text-[12px] text-[#86868b] mt-1">관리자가 포인트 교환형 쿠폰을 등록하면 표시됩니다</p>
            </div>
          ) : exchangeCoupons.map(c => {
            const owned = myCouponIds.has(c.id);
            const soldOut = c.stock != null && c.stock <= 0;
            const canRedeem = gameStats.points >= c.required_points && !owned && !soldOut;
            return (
              <div key={c.id} className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-3 py-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[15px] font-black shrink-0"
                  style={{ background: c.color }}>{c.discount.replace(/[^0-9%]/g, "").slice(0, 3) || "🎟"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[13px] font-bold text-[#0071e3]">{c.required_points.toLocaleString()}P</span>
                    <span className="text-[12px] text-[#6e6e73] truncate">{c.store_name}</span>
                    {c.stock != null && <span className="text-[12px] text-[#86868b]">· 잔여 {c.stock}개</span>}
                  </div>
                </div>
                {owned ? (
                  <div className="flex items-center gap-1 bg-[#D1FAE5] px-3 py-1.5 rounded-xl shrink-0">
                    <CheckCircle2 size={13} className="text-[#00C471]" />
                    <span className="text-[12px] font-bold text-[#065F46]">교환완료</span>
                  </div>
                ) : redeemTarget === c.id ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setRedeemTarget(null)}
                      className="h-8 px-2.5 bg-[#d2d2d7] rounded-xl text-[12px] font-bold text-[#424245] active:opacity-70">취소</button>
                    <button onClick={() => handleExchangeConfirm(c)}
                      className="h-8 px-2.5 bg-[#0071e3] rounded-xl text-[12px] font-bold text-white active:opacity-70">확인</button>
                  </div>
                ) : (
                  <button
                    onClick={() => canRedeem && setRedeemTarget(c.id)}
                    disabled={!canRedeem}
                    className={`h-8 px-3 rounded-xl text-[13px] font-bold transition-colors shrink-0 ${
                      canRedeem ? "bg-[#0071e3] text-white active:bg-[#0058b0]" : "bg-[#d2d2d7] text-[#86868b]"
                    }`}>
                    {soldOut ? "품절" : "교환"}
                  </button>
                )}
              </div>
            );
          })}
          <div className="bg-[#e8f1fd] rounded-xl px-3 py-2.5">
            <p className="text-[13px] text-[#0071e3] leading-relaxed">
              💡 글 작성 <strong>+10P</strong> · 댓글 <strong>+3P</strong> · 좋아요 <strong>+2P</strong> (주 {WEEKLY_LIKES_MAX}회) · 출석 <strong>+5P</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ── 내 쿠폰함 (user_coupons) ── */}
      {myCoupons.length > 0 && (
        <div>
          <SectionLabel
            label="내 쿠폰함"
            icon={<Tag size={18} className="text-[#F59E0B]" />}
            right={
              <span className="text-[13px] font-semibold text-[#6e6e73]">
                사용 가능 {myCoupons.filter(c => c.status === "사용가능").length}장
              </span>
            }
          />
          <div className={`mx-4 ${CARD}`}>
            <div className="p-3 space-y-2">
              {myCoupons.map(c => {
                const used = c.status === "사용완료";
                return (
                  <div key={c.id} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${used ? "bg-[#f5f5f7] opacity-60" : "bg-[#FFFBEB]"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{c.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-[#6e6e73] truncate">{c.store_name}</span>
                        {c.expiry && <span className="text-[12px] text-[#86868b]">~ {c.expiry.slice(0, 10)}</span>}
                      </div>
                    </div>
                    {used ? (
                      <span className="text-[12px] font-bold px-3 py-1.5 rounded-xl bg-[#E5E8EB] text-[#86868b] shrink-0">사용완료</span>
                    ) : (
                      <button onClick={() => handleUseCoupon(c)}
                        className="h-8 px-3 rounded-xl text-[13px] font-bold bg-[#F59E0B] text-white active:opacity-70 shrink-0">
                        사용하기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      {menuGroups.map(grp => (
        <div key={grp.title}>
          <SectionLabel label={grp.title} />
          <div className={`mx-4 ${CARD} divide-y divide-[#f5f5f7]`}>
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
      <div className="mx-4 mt-6">
        <button onClick={() => router.push("/login/")}
          className={`w-full flex items-center justify-center gap-2 h-12 ${CARD} text-[#F04452] text-[15px] font-semibold active:bg-[#FEE2E2] transition-colors`}>
          <LogOut size={16} />로그아웃
        </button>
      </div>

      <p className="text-center text-[12px] text-[#86868b] pt-6 pb-2">검단 라이프 v1.1.0</p>
      <BottomNav />
    </div>
  );
}
