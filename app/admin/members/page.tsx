"use client";
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Search, X, Ban, UserX, RotateCcw, FileText,
  ShieldAlert, MoreHorizontal, Save, MessageSquare, Heart, Eye,
} from "lucide-react";
import {
  adminFetchMembers, adminFetchMemberStats,
  adminSuspendMember, adminUnsuspendMember,
  adminWithdrawMember, adminRestoreMember, adminUpdateMemberNotes,
  adminFetchMemberPosts, adminFetchMemberComments, adminFetchMemberLoginHistory,
  type AdminMember, type MemberStatus, type AdminMemberPost, type AdminMemberComment,
  type AdminMemberLoginHistory, type MemberStats,
} from "@/lib/db/admin-members";

const STATUS_FILTERS: { key: "all" | MemberStatus; label: string; color: string }[] = [
  { key: "all",        label: "전체",   color: "#4E5968" },
  { key: "active",     label: "활성",   color: "#10B981" },
  { key: "suspended",  label: "정지",   color: "#F59E0B" },
  { key: "withdrawn",  label: "탈퇴",   color: "#EF4444" },
];

const SUSPEND_DURATIONS = [
  { days: 1,  label: "1일" },
  { days: 3,  label: "3일" },
  { days: 7,  label: "7일" },
  { days: 30, label: "30일" },
];

function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "-";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}일 전`;
  return formatDate(iso);
}

function statusBadge(status: MemberStatus, suspendedUntil: string | null) {
  if (status === "active") {
    return <span className="text-[11px] font-bold bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full">활성</span>;
  }
  if (status === "suspended") {
    const until = suspendedUntil ? formatDate(suspendedUntil) : "";
    return (
      <span className="text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full" title={`해제: ${until}`}>
        정지{until ? ` ~${until.slice(5)}` : ""}
      </span>
    );
  }
  return <span className="text-[11px] font-bold bg-[#FEE2E2] text-[#991B1B] px-2 py-0.5 rounded-full">탈퇴</span>;
}

function MemberAvatar({ src, size = 32 }: { src: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="rounded-full object-cover bg-[#E5E8EB]" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-[#E5E8EB] flex items-center justify-center text-[#8B95A1]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}>
      👤
    </div>
  );
}

// ─── 회원 상세 모달 ────────────────────────────────────────────────
function MemberDetailModal({ member, onClose, onChanged }: {
  member: AdminMember;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState(member.admin_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showSuspendMenu, setShowSuspendMenu] = useState(false);
  const [posts, setPosts] = useState<AdminMemberPost[]>([]);
  const [comments, setComments] = useState<AdminMemberComment[]>([]);
  const [loginHistory, setLoginHistory] = useState<AdminMemberLoginHistory[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminFetchMemberPosts(member.id, 5).then(setPosts).catch(() => setPosts([]));
    adminFetchMemberComments(member.id, 5).then(setComments).catch(() => setComments([]));
    adminFetchMemberLoginHistory(member.id, 10).then(setLoginHistory).catch(() => setLoginHistory([]));
  }, [member.id]);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await adminUpdateMemberNotes(member.id, notes);
      onChanged();
    } finally {
      setSavingNotes(false);
    }
  }

  async function suspend(days: number) {
    setBusy(true);
    setShowSuspendMenu(false);
    try {
      await adminSuspendMember(member.id, days);
      onChanged();
      onClose();
    } finally { setBusy(false); }
  }

  async function unsuspend() {
    if (!confirm("정지를 해제할까요?")) return;
    setBusy(true);
    try {
      await adminUnsuspendMember(member.id);
      onChanged();
      onClose();
    } finally { setBusy(false); }
  }

  async function withdraw() {
    if (!confirm(`${member.nickname} 회원을 강제 탈퇴 처리할까요?\n탈퇴 시 작성한 글/댓글은 유지되지만 추후 활동이 차단됩니다.`)) return;
    setBusy(true);
    try {
      await adminWithdrawMember(member.id);
      onChanged();
      onClose();
    } finally { setBusy(false); }
  }

  async function restore() {
    if (!confirm("탈퇴 상태를 복구할까요?")) return;
    setBusy(true);
    try {
      await adminRestoreMember(member.id);
      onChanged();
      onClose();
    } finally { setBusy(false); }
  }

  const isActive     = member.status === "active";
  const isSuspended  = member.status === "suspended";
  const isWithdrawn  = member.status === "withdrawn";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-[#E5E8EB] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <MemberAvatar src={member.avatar_url} size={42} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-extrabold text-[#191F28]">{member.nickname}</h2>
                {statusBadge(member.status, member.suspended_until)}
              </div>
              <p className="text-[11px] text-[#8B95A1] mt-0.5 font-mono">{member.id.slice(0, 8)}…</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F2F4F6]">
            <X size={18} className="text-[#8B95A1]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* 프로필 정보 */}
          <section>
            <h3 className="text-[11px] font-bold text-[#8B95A1] uppercase mb-2">프로필</h3>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <Field label="아이디" value={member.email ?? member.id.slice(0, 12)} mono />
              <Field label="우리 동네" value={member.dong ?? "-"} />
              <Field label="레벨" value={`${member.level} (${member.points}P)`} />
              <Field label="가입일" value={formatDate(member.joined_at)} />
              <Field label="마지막 활동" value={timeAgo(member.last_activity_at ?? member.last_active_at)} />
              {isWithdrawn && (
                <Field label="탈퇴일" value={formatDate(member.withdrawn_at)} highlight="#EF4444" />
              )}
              {isSuspended && (
                <Field label="정지 해제일" value={formatDate(member.suspended_until, true)} highlight="#F59E0B" />
              )}
            </div>
          </section>

          {/* 활동 통계 */}
          <section>
            <h3 className="text-[11px] font-bold text-[#8B95A1] uppercase mb-2">활동 통계</h3>
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="작성 글" value={member.post_count} icon={FileText} color="#3182F6" />
              <StatBox label="작성 댓글" value={member.comment_count} icon={MessageSquare} color="#8B5CF6" />
              <StatBox label="받은 좋아요" value={member.received_like_count} icon={Heart} color="#EF4444" />
            </div>
          </section>

          {/* 최근 작성 글 */}
          <section>
            <h3 className="text-[11px] font-bold text-[#8B95A1] uppercase mb-2">최근 작성 글 ({posts.length})</h3>
            {posts.length === 0 ? (
              <p className="text-[12px] text-[#B0B8C1] py-3 text-center bg-[#F8F9FB] rounded-xl">작성 글 없음</p>
            ) : (
              <div className="space-y-1.5">
                {posts.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-[#F8F9FB] rounded-xl">
                    <span className="text-[10px] font-bold bg-[#E5E8EB] text-[#4E5968] px-1.5 py-0.5 rounded-full shrink-0">
                      {p.category}
                    </span>
                    <span className="text-[12px] text-[#191F28] truncate flex-1">{p.title}</span>
                    <span className="text-[11px] text-[#8B95A1] shrink-0 flex items-center gap-1">
                      <Eye size={10} /> {p.view_count}
                      <Heart size={10} /> {p.like_count}
                    </span>
                    <span className="text-[11px] text-[#B0B8C1] shrink-0">{timeAgo(p.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 최근 댓글 */}
          <section>
            <h3 className="text-[11px] font-bold text-[#8B95A1] uppercase mb-2">최근 댓글 ({comments.length})</h3>
            {comments.length === 0 ? (
              <p className="text-[12px] text-[#B0B8C1] py-3 text-center bg-[#F8F9FB] rounded-xl">작성 댓글 없음</p>
            ) : (
              <div className="space-y-1.5">
                {comments.map(c => (
                  <div key={c.id} className="px-3 py-2 bg-[#F8F9FB] rounded-xl">
                    <p className="text-[12px] text-[#191F28] line-clamp-2">{c.content}</p>
                    <p className="text-[11px] text-[#B0B8C1] mt-1">{timeAgo(c.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 로그인 이력 */}
          <section>
            <h3 className="text-[11px] font-bold text-[#8B95A1] uppercase mb-2">로그인 이력 (최근 {loginHistory.length}건)</h3>
            {loginHistory.length === 0 ? (
              <p className="text-[12px] text-[#B0B8C1] py-3 text-center bg-[#F8F9FB] rounded-xl">로그인 이력 없음</p>
            ) : (
              <div className="space-y-1.5">
                {loginHistory.map(h => (
                  <div key={h.id} className="flex items-center gap-2 px-3 py-2 bg-[#F8F9FB] rounded-xl">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${h.success ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                      {h.success ? "성공" : "실패"}
                    </span>
                    <span className="text-[11px] text-[#4E5968] shrink-0">{h.login_type}</span>
                    <span className="text-[11px] text-[#8B95A1] font-mono truncate flex-1">{h.ip_address ?? "-"}</span>
                    {!h.success && h.fail_reason && (
                      <span className="text-[11px] text-[#EF4444] truncate max-w-[80px]">{h.fail_reason}</span>
                    )}
                    <span className="text-[11px] text-[#B0B8C1] shrink-0">{timeAgo(h.login_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 관리자 메모 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-[#8B95A1] uppercase">관리자 메모</h3>
              <button onClick={saveNotes} disabled={savingNotes || notes === member.admin_notes}
                className="flex items-center gap-1 text-[12px] font-bold text-[#3182F6] disabled:text-[#B0B8C1]">
                <Save size={12} /> {savingNotes ? "저장 중..." : "저장"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="이 회원에 대한 관리자 메모를 남겨두세요. (정지 사유, 분쟁 이력 등)"
              className="w-full px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6] resize-none"
            />
          </section>

          {/* 액션 버튼 */}
          <section className="pt-2 border-t border-[#E5E8EB]">
            <h3 className="text-[11px] font-bold text-[#8B95A1] uppercase mb-2">관리 액션</h3>
            <div className="flex flex-wrap gap-2">
              {isActive && (
                <div className="relative">
                  <button onClick={() => setShowSuspendMenu(s => !s)} disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                    <Ban size={13} /> 일시정지
                  </button>
                  {showSuspendMenu && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E8EB] rounded-xl shadow-lg overflow-hidden z-10 min-w-[120px]">
                      {SUSPEND_DURATIONS.map(d => (
                        <button key={d.days} onClick={() => suspend(d.days)}
                          className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#FEF3C7] text-[#92400E] font-semibold">
                          {d.label} 정지
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {isSuspended && (
                <button onClick={unsuspend} disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                  <RotateCcw size={13} /> 정지 해제
                </button>
              )}
              {!isWithdrawn && (
                <button onClick={withdraw} disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                  <UserX size={13} /> 강제 탈퇴
                </button>
              )}
              {isWithdrawn && (
                <button onClick={restore} disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#3182F6] hover:bg-[#2563EB] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                  <RotateCcw size={13} /> 복구
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: string }) {
  return (
    <div className="bg-[#F8F9FB] rounded-xl px-3 py-2">
      <p className="text-[11px] text-[#8B95A1] mb-0.5">{label}</p>
      <p
        className={`text-[12px] font-semibold ${mono ? "font-mono" : ""} truncate`}
        style={{ color: highlight ?? "#191F28" }}
      >{value}</p>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string; color?: string }>; color: string;
}) {
  return (
    <div className="bg-[#F8F9FB] rounded-xl px-3 py-3 text-center">
      <Icon size={14} className="mx-auto mb-1" color={color} />
      <p className="text-[18px] font-extrabold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[#8B95A1] mt-0.5">{label}</p>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────
export default function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [stats, setStats] = useState<MemberStats>({
    total: 0, active: 0, suspended: 0, withdrawn: 0, joinedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<AdminMember | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, st] = await Promise.all([
        adminFetchMembers({ status: statusFilter, search }),
        adminFetchMemberStats(),
      ]);
      setMembers(data);
      setStats(st);
    } catch (e) {
      console.error("[admin/members] load:", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] md:text-[20px] font-extrabold text-[#191F28]">회원 관리</h1>
          <p className="text-[12px] text-[#8B95A1] mt-0.5">{members.length}명 표시 / 전체 {stats.total}명</p>
        </div>
        <button onClick={load}
          className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
          <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <StatCard label="전체 회원"  value={stats.total}       color="#3182F6" />
        <StatCard label="활성"       value={stats.active}      color="#10B981" />
        <StatCard label="정지"       value={stats.suspended}   color="#F59E0B" />
        <StatCard label="탈퇴"       value={stats.withdrawn}   color="#EF4444" />
        <StatCard label="오늘 가입"  value={stats.joinedToday} color="#8B5CF6" />
      </div>

      {/* 검색 + 상태 필터 */}
      <div className="flex flex-col md:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0B8C1]" />
          <input
            className="w-full pl-9 pr-9 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]"
            placeholder="닉네임·이메일·ID 검색…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0B8C1] hover:text-[#4E5968]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[#F2F4F6] rounded-xl p-1 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-colors ${
                statusFilter === f.key
                  ? "bg-white text-[#191F28] shadow-sm"
                  : "text-[#8B95A1] hover:text-[#4E5968]"
              }`}
              style={statusFilter === f.key ? { color: f.color } : undefined}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 회원 목록 */}
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {/* 데스크탑 테이블 헤더 */}
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.6fr_0.8fr_0.8fr_0.6fr_0.5fr_auto] gap-3 bg-[#F8F9FB] border-b border-[#E5E8EB] px-4 py-2.5">
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">회원</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">아이디</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">동네</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">가입일</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">마지막 활동</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">레벨</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">상태</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-right">관리</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-[#B0B8C1] text-[13px]">
            {search || statusFilter !== "all" ? "조건에 맞는 회원 없음" : "회원 없음"}
          </div>
        ) : (
          <div className="divide-y divide-[#F2F4F6]">
            {members.map(m => (
              <div key={m.id}>
                {/* 데스크탑 */}
                <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.6fr_0.8fr_0.8fr_0.6fr_0.5fr_auto] gap-3 items-center px-4 py-3 hover:bg-[#F8F9FB] transition-colors cursor-pointer"
                  onClick={() => setSelected(m)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MemberAvatar src={m.avatar_url} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[#191F28] truncate">{m.nickname}</p>
                      {m.admin_notes && (
                        <p className="text-[11px] text-[#F59E0B] flex items-center gap-0.5 mt-0.5">
                          <ShieldAlert size={10} /> 메모 있음
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] font-mono text-[#8B95A1] truncate">{m.email ?? m.id.slice(0, 12)}</p>
                  <p className="text-[12px] text-[#4E5968] truncate">{m.dong ?? "-"}</p>
                  <p className="text-[12px] text-[#4E5968]">{formatDate(m.joined_at)}</p>
                  <p className="text-[12px] text-[#4E5968]">{timeAgo(m.last_activity_at ?? m.last_active_at)}</p>
                  <p className="text-[12px] font-semibold text-[#3182F6]">{m.level}</p>
                  <div>{statusBadge(m.status, m.suspended_until)}</div>
                  <button onClick={e => { e.stopPropagation(); setSelected(m); }}
                    className="p-1.5 rounded-lg hover:bg-[#E5E8EB]">
                    <MoreHorizontal size={14} className="text-[#8B95A1]" />
                  </button>
                </div>

                {/* 모바일 카드 */}
                <button onClick={() => setSelected(m)}
                  className="md:hidden w-full p-4 text-left active:bg-[#F8F9FB]">
                  <div className="flex items-start gap-3">
                    <MemberAvatar src={m.avatar_url} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[14px] font-bold text-[#191F28]">{m.nickname}</span>
                        {statusBadge(m.status, m.suspended_until)}
                      </div>
                      <p className="text-[11px] font-mono text-[#8B95A1] truncate">
                        {m.email ?? m.id.slice(0, 16)}…
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#4E5968] flex-wrap">
                        <span>📍 {m.dong ?? "-"}</span>
                        <span>·</span>
                        <span>가입 {formatDate(m.joined_at).slice(5)}</span>
                        <span>·</span>
                        <span>{m.level} · {m.points}P</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8B95A1]">
                        <span className="flex items-center gap-0.5"><FileText size={10} /> {m.post_count}</span>
                        <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {m.comment_count}</span>
                        <span className="flex items-center gap-0.5"><Heart size={10} /> {m.received_like_count}</span>
                        <span className="ml-auto">{timeAgo(m.last_activity_at ?? m.last_active_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 회원 상세 모달 */}
      {selected && (
        <MemberDetailModal
          member={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E8EB] px-3 py-3 text-center">
      <p className="text-[18px] md:text-[22px] font-extrabold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[#8B95A1] mt-0.5">{label}</p>
    </div>
  );
}
