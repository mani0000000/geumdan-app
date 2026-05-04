"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, FileText, MessageSquare, Heart, Bell, Shield,
  HelpCircle, LogOut, Settings, Gift, Zap, Trophy, CheckCircle2,
  Coins, Star, Pencil, Trash2, X, Check, Tag,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import Avatar from "@/components/ui/Avatar";
import {
  getUserProfile,
  getOrCreateUserId,
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
import { fetchMyPosts, deletePost, updatePost } from "@/lib/db/posts";
import { fetchMyComments, deleteComment, updateComment, type DBComment } from "@/lib/db/comments";
import type { Post } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

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

type TabKey = "posts" | "comments";

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

  // 내 글 / 내 댓글 탭
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myComments, setMyComments] = useState<DBComment[]>([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  const reloadMyContent = useCallback(() => {
    return getOrCreateUserId().then(uid =>
      Promise.all([fetchMyPosts(uid), fetchMyComments(uid)]).then(([posts, comments]) => {
        setMyPosts(posts);
        setMyComments(comments);
        setPostCount(posts.length);
        setCommentCount(comments.length);
        setTabsLoading(false);
      })
    );
  }, []);

  useEffect(() => {
    getUserProfile().then(setProfile);
    getUserGameStats().then(setGameStats);
    getMyPostCount().then(setPostCount);
    getMyCommentCount().then(setCommentCount);
    getDownloadedCoupons().then(c => setCouponCount(c.length));
    getFavoriteBuses().then(b => setBusCount(b.length));
    getFavoriteStores().then(s => setStoreCount(s.length));
    getFavoriteApts().then(a => setAptCount(a.length));
    reloadMyContent();
  }, [reloadMyContent]);

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
  const joinedAt = profile?.joined_at ?? new Date().toISOString().slice(0, 10);
  const avatarUrl = profile?.avatar_url ?? null;

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

  // 내 글 수정 / 삭제
  const startEditPost = (p: Post) => {
    setEditingPostId(p.id);
    setEditPostTitle(p.title);
    setEditPostContent(p.content);
  };
  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditPostTitle("");
    setEditPostContent("");
  };
  const saveEditPost = async () => {
    if (!editingPostId || !editPostTitle.trim() || !editPostContent.trim()) return;
    const updated = await updatePost(editingPostId, {
      title: editPostTitle.trim(),
      content: editPostContent.trim(),
    });
    if (updated) {
      setMyPosts(prev => prev.map(p => p.id === editingPostId ? updated : p));
      cancelEditPost();
    }
  };
  const handleDeletePost = async (id: string) => {
    if (!confirm("이 글을 삭제하시겠습니까?")) return;
    const ok = await deletePost(id);
    if (ok) setMyPosts(prev => prev.filter(p => p.id !== id));
  };

  // 내 댓글 수정 / 삭제
  const startEditComment = (c: DBComment) => {
    setEditingCommentId(c.id);
    setEditCommentContent(c.content);
  };
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentContent("");
  };
  const saveEditComment = async () => {
    if (!editingCommentId || !editCommentContent.trim()) return;
    const ok = await updateComment(editingCommentId, editCommentContent.trim());
    if (ok) {
      setMyComments(prev => prev.map(c =>
        c.id === editingCommentId ? { ...c, content: editCommentContent.trim() } : c
      ));
      cancelEditComment();
    }
  };
  const handleDeleteComment = async (id: string) => {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    const ok = await deleteComment(id);
    if (ok) setMyComments(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="마이페이지" />

      {/* ── 1. 프로필 카드 ─────────────────────────────────────────── */}
      <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <div className="h-16 bg-[#0071e3]" />
        <div className="px-4 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="border-4 border-white rounded-full">
              <Avatar src={avatarUrl} size={72} alt={nickname} />
            </div>
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
          {profile?.intro && (
            <p className="text-[13px] text-[#86868b] mt-1.5 leading-relaxed">{profile.intro}</p>
          )}
        </div>
      </div>

      {/* ── 2. 활동 요약 카드 그리드 ───────────────────────────────── */}
      <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
        <DashCard icon={<FileText size={18} className="text-[#0071e3]" />} label="작성한 글" value={postCount} />
        <DashCard icon={<MessageSquare size={18} className="text-[#8B5CF6]" />} label="작성한 댓글" value={commentCount} />
        <DashCard icon={<Heart size={18} className="text-[#F04452]" />} label="받은 좋아요" value={profile?.like_count ?? 0} />
        <DashCard icon={<Coins size={18} className="text-[#F59E0B]" />} label="보유 포인트" value={gameStats.points} suffix="P" />
      </div>

      {/* ── 3. 내 글 / 내 댓글 탭 ──────────────────────────────────── */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <div className="flex border-b border-[#f5f5f7]">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 h-12 text-[14px] font-bold transition-colors ${
              activeTab === "posts" ? "text-[#0071e3] border-b-2 border-[#0071e3]" : "text-[#86868b]"
            }`}>
            내 글 ({myPosts.length})
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`flex-1 h-12 text-[14px] font-bold transition-colors ${
              activeTab === "comments" ? "text-[#0071e3] border-b-2 border-[#0071e3]" : "text-[#86868b]"
            }`}>
            내 댓글 ({myComments.length})
          </button>
        </div>

        <div className="p-3">
          {tabsLoading ? (
            <div className="py-8 text-center text-[13px] text-[#86868b]">불러오는 중...</div>
          ) : activeTab === "posts" ? (
            myPosts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-[#86868b]">아직 작성한 글이 없어요</p>
                <button onClick={() => router.push("/community/write/")}
                  className="mt-3 h-8 px-4 rounded-xl bg-[#e8f1fd] text-[#0071e3] text-[13px] font-bold active:opacity-70">
                  첫 글 작성하기
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {myPosts.map(p => (
                  <div key={p.id} className="bg-[#f9fafb] rounded-xl p-3">
                    {editingPostId === p.id ? (
                      <div className="space-y-2">
                        <input value={editPostTitle} onChange={e => setEditPostTitle(e.target.value)} maxLength={50}
                          className="w-full px-3 py-2 rounded-lg border border-[#d2d2d7] text-[14px] outline-none focus:border-[#0071e3]" />
                        <textarea value={editPostContent} onChange={e => setEditPostContent(e.target.value)} rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-[#d2d2d7] text-[14px] outline-none focus:border-[#0071e3] resize-none" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={cancelEditPost}
                            className="h-8 px-3 rounded-lg border border-[#d2d2d7] text-[13px] text-[#6e6e73] active:opacity-70">
                            <X size={12} className="inline mr-1" />취소
                          </button>
                          <button onClick={saveEditPost}
                            className="h-8 px-3 rounded-lg bg-[#0071e3] text-white text-[13px] font-bold active:opacity-80">
                            <Check size={12} className="inline mr-1" />저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => router.push(`/community/detail/?id=${p.id}`)}
                          className="w-full text-left active:opacity-60">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-0.5 rounded-full">{p.category}</span>
                            <span className="text-[11px] text-[#86868b]">{formatRelativeTime(p.createdAt)}</span>
                          </div>
                          <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{p.title}</p>
                          <p className="text-[12px] text-[#86868b] mt-1 line-clamp-1">{p.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-[12px] text-[#86868b]">
                            <span>♥ {p.likeCount}</span>
                            <span>💬 {p.commentCount}</span>
                            <span>👁 {p.viewCount}</span>
                          </div>
                        </button>
                        <div className="flex gap-2 mt-2 pt-2 border-t border-[#eef0f2]">
                          <button onClick={() => startEditPost(p)}
                            className="flex-1 h-8 rounded-lg bg-white border border-[#d2d2d7] text-[12px] text-[#424245] font-medium active:opacity-70">
                            <Pencil size={11} className="inline mr-1" />수정
                          </button>
                          <button onClick={() => handleDeletePost(p.id)}
                            className="flex-1 h-8 rounded-lg bg-white border border-[#FECACA] text-[12px] text-[#F04452] font-medium active:opacity-70">
                            <Trash2 size={11} className="inline mr-1" />삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            myComments.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#86868b]">아직 작성한 댓글이 없어요</div>
            ) : (
              <div className="space-y-2">
                {myComments.map(c => (
                  <div key={c.id} className="bg-[#f9fafb] rounded-xl p-3">
                    {editingCommentId === c.id ? (
                      <div className="space-y-2">
                        <textarea value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-[#d2d2d7] text-[14px] outline-none focus:border-[#0071e3] resize-none" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={cancelEditComment}
                            className="h-8 px-3 rounded-lg border border-[#d2d2d7] text-[13px] text-[#6e6e73] active:opacity-70">
                            <X size={12} className="inline mr-1" />취소
                          </button>
                          <button onClick={saveEditComment}
                            className="h-8 px-3 rounded-lg bg-[#0071e3] text-white text-[13px] font-bold active:opacity-80">
                            <Check size={12} className="inline mr-1" />저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => router.push(`/community/detail/?id=${c.postId}`)}
                          className="w-full text-left active:opacity-60">
                          <p className="text-[12px] text-[#86868b] mb-1 line-clamp-1">
                            {c.postTitle ? `↳ ${c.postTitle}` : "↳ 원글 보기"}
                          </p>
                          <p className="text-[14px] text-[#1d1d1f] line-clamp-2">{c.content}</p>
                          <p className="text-[11px] text-[#86868b] mt-1">{formatRelativeTime(c.createdAt)}</p>
                        </button>
                        <div className="flex gap-2 mt-2 pt-2 border-t border-[#eef0f2]">
                          <button onClick={() => startEditComment(c)}
                            className="flex-1 h-8 rounded-lg bg-white border border-[#d2d2d7] text-[12px] text-[#424245] font-medium active:opacity-70">
                            <Pencil size={11} className="inline mr-1" />수정
                          </button>
                          <button onClick={() => handleDeleteComment(c.id)}
                            className="flex-1 h-8 rounded-lg bg-white border border-[#FECACA] text-[12px] text-[#F04452] font-medium active:opacity-70">
                            <Trash2 size={11} className="inline mr-1" />삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── 4. 포인트 & 월간 레벨 카드 ──────────────────────────────── */}
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

          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[12px] text-white/70">{monthlyLevel}</span>
              <span className="text-[12px] text-white/70">{nextLevel} (앞으로 {remainToNext}P)</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

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

      {/* ── 5. 주간 미션 ──────────────────────────────────────────── */}
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

      {/* ── 6. 포인트 교환 ───────────────────────────────────────── */}
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
      </div>

      {/* ── 7. 즐겨찾기 / 쿠폰 빠른 메뉴 ───────────────────────────── */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <p className="px-4 pt-4 pb-1 text-[13px] font-bold text-[#6e6e73]">즐겨찾기</p>
        <div className="divide-y divide-[#f5f5f7]">
          <MenuRow icon={<Tag size={18} className="text-[#F59E0B]" />} label="다운로드한 쿠폰" badge={couponCount} onClick={() => router.push("/coupons/")} />
          <MenuRow icon={<Star size={18} className="text-[#FBBF24]" />} label="즐겨찾는 버스" badge={busCount} onClick={() => router.push("/transport/")} />
          <MenuRow icon={<Star size={18} className="text-[#FBBF24]" />} label="즐겨찾는 상가" badge={storeCount} onClick={() => router.push("/stores/")} />
          <MenuRow icon={<Star size={18} className="text-[#FBBF24]" />} label="관심 아파트" badge={aptCount} onClick={() => router.push("/community/?tab=시세")} />
        </div>
      </div>

      {/* ── 8. 설정 ───────────────────────────────────────────── */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        <p className="px-4 pt-4 pb-1 text-[13px] font-bold text-[#6e6e73]">설정</p>
        <div className="divide-y divide-[#f5f5f7]">
          <MenuRow icon={<Bell size={18} className="text-[#6e6e73]" />} label="알림 설정" onClick={() => router.push("/mypage/notifications/")} />
          <MenuRow icon={<Shield size={18} className="text-[#6e6e73]" />} label="개인정보 보호" onClick={() => router.push("/mypage/settings/")} />
          <MenuRow icon={<Settings size={18} className="text-[#6e6e73]" />} label="앱 설정" onClick={() => router.push("/mypage/settings/")} />
          <MenuRow icon={<HelpCircle size={18} className="text-[#6e6e73]" />} label="고객센터 / 신고" />
        </div>
      </div>

      {/* ── 9. 로그아웃 ─────────────────────────────────────────── */}
      <div className="mx-4 mb-6">
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

function DashCard({
  icon, label, value, suffix = "",
}: {
  icon: React.ReactNode; label: string; value: number; suffix?: string;
}) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[12px] text-[#6e6e73] font-medium">{label}</span>
      </div>
      <p className="text-[20px] font-black text-[#1d1d1f]">
        {value.toLocaleString()}{suffix}
      </p>
    </div>
  );
}

function MenuRow({
  icon, label, badge, onClick,
}: {
  icon: React.ReactNode; label: string; badge?: number; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center px-4 py-3.5 active:bg-[#f5f5f7] transition-colors">
      <span className="mr-3 shrink-0">{icon}</span>
      <span className="flex-1 text-[15px] text-[#1d1d1f] text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-[#e8f1fd] text-[#0071e3] text-[13px] font-bold px-2 py-0.5 rounded-full mr-2">{badge}</span>
      )}
      <ChevronRight size={16} className="text-[#d2d2d7]" />
    </button>
  );
}
