"use client";
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Search, X, Users, UserX, ShieldOff,
  ChevronRight, Clock, FileText,
  AlertTriangle, CheckCircle, Ban, LogIn, StickyNote,
  ChevronLeft, Filter, Tag, Coins, PenLine, Bookmark,
  Bus, Building2, Home, Star,
} from "lucide-react";
import {
  adminFetchMembers, adminSuspendMember, adminUnsuspendMember,
  adminWithdrawMember, adminUpdateMemberNotes,
  adminFetchMemberLogs, adminFetchLoginHistory,
  adminFetchMemberCoupons, adminFetchMemberPoints,
  adminFetchMemberPosts, adminFetchMemberComments,
  adminFetchMemberSavedPosts,
  adminFetchMemberFavBuses, adminFetchMemberFavStores, adminFetchMemberFavApts,
  type AdminMember, type MemberLog, type LoginHistory, type MemberStatus,
  type MemberCoupon, type MemberPointRecord, type MemberPost, type MemberComment,
  type MemberSavedPost, type MemberFavBus, type MemberFavStore, type MemberFavApt,
} from "@/lib/db/admin-members";

type StatusFilter  = "all" | MemberStatus;
type PeriodFilter  = "all" | "today" | "7d" | "30d" | "90d" | "custom";
type DetailTab     = "points" | "coupon" | "posts" | "saved" | "log" | "login";

// ─── 포맷 헬퍼 ────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
function relativeTime(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)    return "방금 전";
  if (min < 60)   return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24)    return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30)   return `${day}일 전`;
  return fmtDate(iso);
}
function periodToDate(p: PeriodFilter): { from?: string; to?: string } {
  const pad = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  if (p === "today")  return { from: pad(now), to: pad(now) };
  if (p === "7d")     return { from: pad(new Date(Date.now() - 6 * 86400000)) };
  if (p === "30d")    return { from: pad(new Date(Date.now() - 29 * 86400000)) };
  if (p === "90d")    return { from: pad(new Date(Date.now() - 89 * 86400000)) };
  return {};
}
function suspendUntilDate(opt: SuspendOption): string {
  const now = new Date();
  const days: Record<SuspendOption, number> = { "1d": 1, "3d": 3, "7d": 7, "30d": 30, "perm": 365 * 50 };
  return new Date(now.getTime() + days[opt] * 86400000).toISOString();
}

type SuspendOption = "1d" | "3d" | "7d" | "30d" | "perm";

function statusBadge(m: AdminMember) {
  const isSuspExpired = m.status === "suspended" && m.suspended_until && new Date(m.suspended_until) < new Date();
  const effective     = isSuspExpired ? "active" : m.status;
  if (effective === "suspended") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded-full">
      <Ban size={9} />정지
    </span>
  );
  if (effective === "withdrawn") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#F2F4F6] text-[#8B95A1] px-2 py-0.5 rounded-full">
      <UserX size={9} />탈퇴
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-full">
      <CheckCircle size={9} />활성
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTION_META: Record<string, { label: string; color: string; Icon: any }> = {
  suspend:   { label: "계정 정지",  color: "#DC2626", Icon: Ban },
  unsuspend: { label: "정지 해제", color: "#059669", Icon: ShieldOff },
  withdraw:  { label: "강제 탈퇴", color: "#9333EA", Icon: UserX },
  note:      { label: "메모 수정",  color: "#3182F6", Icon: StickyNote },
};

// ─── 정지 모달 ────────────────────────────────────────────────
function SuspendModal({
  member, onClose, onConfirm,
}: { member: AdminMember; onClose: () => void; onConfirm: (until: string, reason: string) => Promise<void> }) {
  const [opt, setOpt]       = useState<SuspendOption>("7d");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const opts: { v: SuspendOption; label: string }[] = [
    { v: "1d",   label: "1일"  },
    { v: "3d",   label: "3일"  },
    { v: "7d",   label: "7일"  },
    { v: "30d",  label: "30일" },
    { v: "perm", label: "영구" },
  ];
  async function submit() {
    if (!reason.trim()) return;
    setSaving(true);
    await onConfirm(suspendUntilDate(opt), reason.trim());
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ban size={18} className="text-[#DC2626]" />
          <h3 className="text-[16px] font-extrabold text-[#191F28]">계정 정지</h3>
        </div>
        <p className="text-[13px] text-[#4E5968] mb-4">
          <span className="font-bold">{member.nickname || "이름없음"}</span> 회원을 정지합니다.
        </p>
        {/* 기간 선택 */}
        <p className="text-[12px] font-bold text-[#8B95A1] mb-2">정지 기간</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {opts.map(o => (
            <button key={o.v} onClick={() => setOpt(o.v)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                opt === o.v
                  ? "bg-[#DC2626] text-white border-[#DC2626]"
                  : "bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#DC2626]"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
        {/* 사유 */}
        <p className="text-[12px] font-bold text-[#8B95A1] mb-2">정지 사유 <span className="text-[#DC2626]">*</span></p>
        <textarea
          className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#DC2626] resize-none"
          rows={3}
          placeholder="정지 사유를 입력하세요"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6]">
            취소
          </button>
          <button onClick={submit} disabled={!reason.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-[#DC2626] text-white text-[13px] font-bold disabled:opacity-40">
            {saving ? "처리 중..." : "정지 적용"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 강제탈퇴 확인 모달 ───────────────────────────────────────
function WithdrawModal({
  member, onClose, onConfirm,
}: { member: AdminMember; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!reason.trim()) return;
    setSaving(true);
    await onConfirm(reason.trim());
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-[#9333EA]" />
          <h3 className="text-[16px] font-extrabold text-[#191F28]">강제 탈퇴</h3>
        </div>
        <p className="text-[13px] text-[#4E5968] mb-1">
          <span className="font-bold">{member.nickname || "이름없음"}</span> 회원을 탈퇴 처리합니다.
        </p>
        <p className="text-[12px] text-[#F04452] font-semibold mb-4">이 작업은 되돌릴 수 없습니다.</p>
        <p className="text-[12px] font-bold text-[#8B95A1] mb-2">탈퇴 사유 <span className="text-[#DC2626]">*</span></p>
        <textarea
          className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#9333EA] resize-none"
          rows={3}
          placeholder="강제 탈퇴 사유를 입력하세요"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6]">
            취소
          </button>
          <button onClick={submit} disabled={!reason.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-[#9333EA] text-white text-[13px] font-bold disabled:opacity-40">
            {saving ? "처리 중..." : "탈퇴 처리"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 회원 상세 패널 ───────────────────────────────────────────
// ─── 빈 상태 공통 컴포넌트 ────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return <div className="py-8 text-center text-[12px] text-[#B0B8C1]">{label}</div>;
}
function LoadingState() {
  return (
    <div className="py-8 flex justify-center">
      <RefreshCw size={16} className="animate-spin text-[#3182F6]" />
    </div>
  );
}

// ─── 회원 상세 패널 ───────────────────────────────────────────
function MemberDetail({
  member: initialMember,
  onClose,
  onMemberUpdate,
  onSuspend,
  onUnsuspend,
  onWithdraw,
}: {
  member: AdminMember;
  onClose: () => void;
  onMemberUpdate: (m: AdminMember) => void;
  onSuspend: () => void;
  onUnsuspend: () => Promise<void>;
  onWithdraw: () => void;
}) {
  const [member, setMember]           = useState(initialMember);
  const [detailTab, setDetailTab]     = useState<DetailTab>("points");
  const [notes, setNotes]             = useState(initialMember.admin_notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [unsuspending, setUnsuspending] = useState(false);

  // 탭별 데이터 (lazy load)
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});
  const [coupons,    setCoupons]    = useState<MemberCoupon[]>([]);
  const [points,     setPoints]     = useState<MemberPointRecord[]>([]);
  const [posts,      setPosts]      = useState<MemberPost[]>([]);
  const [comments,   setComments]   = useState<MemberComment[]>([]);
  const [saved,      setSaved]      = useState<MemberSavedPost[]>([]);
  const [favBuses,   setFavBuses]   = useState<MemberFavBus[]>([]);
  const [favStores,  setFavStores]  = useState<MemberFavStore[]>([]);
  const [favApts,    setFavApts]    = useState<MemberFavApt[]>([]);
  const [logs,       setLogs]       = useState<MemberLog[]>([]);
  const [logins,     setLogins]     = useState<LoginHistory[]>([]);

  const loadedTabs = useState<Set<string>>(new Set())[0];

  useEffect(() => { setMember(initialMember); setNotes(initialMember.admin_notes ?? ""); }, [initialMember]);

  // 탭 변경 시 해당 데이터 lazy load
  useEffect(() => {
    if (loadedTabs.has(detailTab)) return;
    loadedTabs.add(detailTab);
    setTabLoading(prev => ({ ...prev, [detailTab]: true }));

    const uid = member.id;
    const done = () => setTabLoading(prev => ({ ...prev, [detailTab]: false }));

    if (detailTab === "points") {
      adminFetchMemberPoints(uid).then(d => { setPoints(d); done(); }).catch(done);
    } else if (detailTab === "coupon") {
      adminFetchMemberCoupons(uid).then(d => { setCoupons(d); done(); }).catch(done);
    } else if (detailTab === "posts") {
      Promise.all([adminFetchMemberPosts(uid), adminFetchMemberComments(uid)])
        .then(([p, c]) => { setPosts(p); setComments(c); done(); }).catch(done);
    } else if (detailTab === "saved") {
      Promise.all([
        adminFetchMemberSavedPosts(uid),
        adminFetchMemberFavBuses(uid),
        adminFetchMemberFavStores(uid),
        adminFetchMemberFavApts(uid),
      ]).then(([sp, fb, fs, fa]) => { setSaved(sp); setFavBuses(fb); setFavStores(fs); setFavApts(fa); done(); }).catch(done);
    } else if (detailTab === "log") {
      adminFetchMemberLogs(uid).then(d => { setLogs(d); done(); }).catch(done);
    } else if (detailTab === "login") {
      adminFetchLoginHistory(uid).then(d => { setLogins(d); done(); }).catch(done);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailTab, member.id]);

  async function saveNotes() {
    setNotesSaving(true);
    await adminUpdateMemberNotes(member.id, notes);
    const updated = { ...member, admin_notes: notes };
    setMember(updated);
    onMemberUpdate(updated);
    // 로그 갱신
    loadedTabs.delete("log");
    setTabLoading(prev => ({ ...prev, log: false }));
    setNotesSaving(false);
  }

  async function handleUnsuspend() {
    setUnsuspending(true);
    await onUnsuspend();
    setUnsuspending(false);
  }

  const isSuspExpired = member.status === "suspended" && member.suspended_until && new Date(member.suspended_until) < new Date();
  const effectiveStatus: MemberStatus = isSuspExpired ? "active" : member.status;

  // 포인트 등급 정보
  const GRADES = [
    { name: "검단 새내기", min: 0,    max: 499  },
    { name: "검단 단골",   min: 500,  max: 1499 },
    { name: "검단 일꾼",   min: 1500, max: 2999 },
    { name: "검단 지킴이", min: 3000, max: Infinity },
  ];
  const currentGrade = GRADES.findLast(g => (member.points ?? 0) >= g.min) ?? GRADES[0];
  const nextGrade    = GRADES.find(g => g.min > (member.points ?? 0));
  const gradeProgress = nextGrade
    ? Math.min(100, ((member.points ?? 0) - currentGrade.min) / (nextGrade.min - currentGrade.min) * 100)
    : 100;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TABS: { v: DetailTab; label: string; Icon: any }[] = [
    { v: "points", label: "포인트",    Icon: Coins    },
    { v: "coupon", label: "쿠폰",      Icon: Tag      },
    { v: "posts",  label: "게시물",    Icon: PenLine  },
    { v: "saved",  label: "저장",      Icon: Bookmark },
    { v: "log",    label: "관리로그",  Icon: FileText },
    { v: "login",  label: "로그인",    Icon: LogIn    },
  ];

  const isLoading = tabLoading[detailTab];

  return (
    <div className="flex flex-col h-full bg-[#F5F6F8]">
      {/* ── 패널 헤더 ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E5E8EB] shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F2F4F6] text-[#8B95A1]">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-extrabold text-[#191F28] truncate">
            {member.nickname || "이름없음"}
            <span className="text-[12px] text-[#B0B8C1] font-normal ml-2">{member.dong}</span>
          </p>
          <p className="text-[11px] text-[#B0B8C1] font-mono">{member.id.slice(0, 16)}…</p>
        </div>
        {statusBadge(member)}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── 기본 정보 카드 ───────────────────────────────── */}
        <div className="mx-3 mt-3 mb-2 bg-white rounded-2xl border border-[#E5E8EB] p-4">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "등급",   value: member.level || "-",                          color: "#9333EA" },
              { label: "포인트", value: `${(member.points ?? 0).toLocaleString()}P`,   color: "#3182F6" },
              { label: "작성글", value: String(member.post_count),                     color: "#059669" },
              { label: "댓글",   value: String(member.comment_count),                  color: "#EA580C" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#F8F9FB] rounded-xl px-2 py-2 text-center">
                <p className="text-[10px] text-[#8B95A1] mb-0.5">{label}</p>
                <p className="text-[12px] font-extrabold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-[#8B95A1]">
              <span>가입</span><span className="font-medium text-[#4E5968]">{fmtDate(member.joined_at)}</span>
            </div>
            <div className="flex justify-between text-[#8B95A1]">
              <span>최근 활동</span><span className="font-medium text-[#4E5968]">{relativeTime(member.last_active_at) ?? "-"}</span>
            </div>
            {effectiveStatus === "suspended" && (
              <div className="flex justify-between text-[#8B95A1]">
                <span>정지 해제</span>
                <span className="font-bold text-[#DC2626]">
                  {(member.suspended_until ?? "").slice(0, 4) === "2074" ? "영구" : fmtDate(member.suspended_until)}
                  {member.suspended_reason ? ` — ${member.suspended_reason}` : ""}
                </span>
              </div>
            )}
            {effectiveStatus === "withdrawn" && (
              <div className="flex justify-between text-[#8B95A1]">
                <span>탈퇴일</span><span className="font-medium text-[#4E5968]">{fmtDate(member.withdrawn_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 액션 버튼 ─────────────────────────────────────── */}
        {effectiveStatus !== "withdrawn" && (
          <div className="mx-3 mb-2 flex gap-2">
            {effectiveStatus === "active" && (
              <button onClick={onSuspend}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FEF2F2] text-[#DC2626] text-[12px] font-bold border border-[#FECACA] hover:bg-[#FEE2E2] transition-colors">
                <Ban size={13} />계정 정지
              </button>
            )}
            {effectiveStatus === "suspended" && (
              <button onClick={handleUnsuspend} disabled={unsuspending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#ECFDF5] text-[#059669] text-[12px] font-bold border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors disabled:opacity-50">
                <ShieldOff size={13} />{unsuspending ? "처리 중..." : "정지 해제"}
              </button>
            )}
            <button onClick={onWithdraw}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FAF5FF] text-[#9333EA] text-[12px] font-bold border border-[#E9D5FF] hover:bg-[#F3E8FF] transition-colors">
              <UserX size={13} />강제 탈퇴
            </button>
          </div>
        )}

        {/* ── 관리자 메모 ──────────────────────────────────── */}
        <div className="mx-3 mb-2 bg-white rounded-2xl border border-[#E5E8EB] p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <StickyNote size={12} className="text-[#3182F6]" />
            <p className="text-[11px] font-bold text-[#4E5968]">관리자 메모 (회원 비공개)</p>
          </div>
          <textarea
            className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#3182F6] resize-none bg-[#F8F9FB]"
            rows={2}
            placeholder="내부 메모 입력..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button onClick={saveNotes} disabled={notesSaving || notes === member.admin_notes}
            className="mt-1.5 w-full py-1.5 rounded-xl bg-[#3182F6] text-white text-[12px] font-bold disabled:opacity-40">
            {notesSaving ? "저장 중..." : "저장"}
          </button>
        </div>

        {/* ── 데이터 탭 ─────────────────────────────────────── */}
        <div className="mx-3 mb-3 bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
          {/* 탭 헤더 (가로 스크롤) */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-[#E5E8EB]">
            {TABS.map(t => (
              <button key={t.v} onClick={() => setDetailTab(t.v)}
                className={`shrink-0 flex items-center gap-1 px-3 py-2.5 text-[11px] font-bold border-b-2 transition-colors whitespace-nowrap ${
                  detailTab === t.v
                    ? "border-[#3182F6] text-[#3182F6] bg-[#F0F6FF]"
                    : "border-transparent text-[#8B95A1] hover:bg-[#F8F9FB]"
                }`}>
                <t.Icon size={12} />{t.label}
              </button>
            ))}
          </div>

          {/* ── 포인트 탭 ────────────────────────────────── */}
          {detailTab === "points" && (
            isLoading ? <LoadingState /> : (
              <div>
                {/* 등급 진행 */}
                <div className="px-4 py-3 border-b border-[#F2F4F6]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-[13px] font-extrabold text-[#9333EA]">{currentGrade.name}</span>
                      {nextGrade && (
                        <span className="text-[11px] text-[#8B95A1] ml-2">→ {nextGrade.name} ({(nextGrade.min - (member.points ?? 0)).toLocaleString()}P 필요)</span>
                      )}
                    </div>
                    <span className="text-[13px] font-black text-[#3182F6]">{(member.points ?? 0).toLocaleString()}P</span>
                  </div>
                  <div className="h-2 bg-[#F2F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#9333EA] rounded-full transition-all" style={{ width: `${gradeProgress}%` }} />
                  </div>
                </div>
                {/* 포인트 내역 */}
                {points.length === 0 ? <EmptyState label="포인트 내역 없음" /> : (
                  <div className="divide-y divide-[#F2F4F6]">
                    {points.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-[12px] font-medium text-[#191F28]">{p.desc_text || "포인트 변동"}</p>
                          <p className="text-[10px] text-[#B0B8C1]">{fmtDateTime(p.created_at)}</p>
                        </div>
                        <span className={`text-[13px] font-extrabold ${p.points >= 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                          {p.points >= 0 ? "+" : ""}{p.points.toLocaleString()}P
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── 쿠폰 탭 ─────────────────────────────────── */}
          {detailTab === "coupon" && (
            isLoading ? <LoadingState /> : (
              coupons.length === 0 ? <EmptyState label="다운로드한 쿠폰 없음" /> : (
                <div className="divide-y divide-[#F2F4F6]">
                  {coupons.map(c => (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#191F28] truncate">{c.title}</p>
                          <p className="text-[11px] text-[#4E5968]">{c.store_name}</p>
                          <p className="text-[11px] text-[#3182F6] font-bold mt-0.5">{c.discount}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === "사용완료"
                              ? "bg-[#F2F4F6] text-[#8B95A1]"
                              : "bg-[#ECFDF5] text-[#059669]"
                          }`}>{c.status}</span>
                          <p className="text-[10px] text-[#B0B8C1] mt-1">만료 {c.expiry}</p>
                          <p className="text-[10px] text-[#B0B8C1]">다운 {fmtDate(c.downloaded_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )
          )}

          {/* ── 게시물 탭 ─────────────────────────────── */}
          {detailTab === "posts" && (
            isLoading ? <LoadingState /> : (
              <div>
                {/* 작성글 */}
                <div className="px-4 py-2 bg-[#F8F9FB] border-b border-[#E5E8EB]">
                  <span className="text-[11px] font-extrabold text-[#4E5968]">작성글 {posts.length}건</span>
                </div>
                {posts.length === 0 ? <EmptyState label="작성한 글 없음" /> : (
                  <div className="divide-y divide-[#F2F4F6]">
                    {posts.map(p => (
                      <div key={p.id} className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-medium text-[#191F28] flex-1 min-w-0 truncate">{p.title || "(제목없음)"}</p>
                          <span className="text-[10px] bg-[#F2F4F6] text-[#8B95A1] px-1.5 py-0.5 rounded-full shrink-0">{p.category}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[#B0B8C1]">
                          <span>❤️ {p.like_count}</span>
                          <span>💬 {p.comment_count}</span>
                          <span>{fmtDateTime(p.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 댓글 */}
                <div className="px-4 py-2 bg-[#F8F9FB] border-t border-b border-[#E5E8EB]">
                  <span className="text-[11px] font-extrabold text-[#4E5968]">작성댓글 {comments.length}건</span>
                </div>
                {comments.length === 0 ? <EmptyState label="작성한 댓글 없음" /> : (
                  <div className="divide-y divide-[#F2F4F6]">
                    {comments.map(c => (
                      <div key={c.id} className="px-4 py-2.5">
                        <p className="text-[12px] text-[#191F28] leading-snug line-clamp-2">{c.content}</p>
                        <p className="text-[10px] text-[#B0B8C1] mt-1">{fmtDateTime(c.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── 저장·즐겨찾기 탭 ─────────────────────── */}
          {detailTab === "saved" && (
            isLoading ? <LoadingState /> : (
              <div>
                {/* 저장한 글 */}
                <SectionHeader label="저장한 글" count={saved.length} Icon={Bookmark} />
                {saved.length === 0 ? <EmptyState label="저장한 글 없음" /> : (
                  <div className="divide-y divide-[#F2F4F6]">
                    {saved.map(s => (
                      <div key={s.id} className="flex items-center gap-2 px-4 py-2.5">
                        <Bookmark size={11} className="text-[#3182F6] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[#191F28] truncate">{s.title || "(제목없음)"}</p>
                          <p className="text-[10px] text-[#B0B8C1]">{s.category} · {fmtDate(s.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 즐겨찾기 버스 */}
                <SectionHeader label="즐겨찾기 버스" count={favBuses.length} Icon={Bus} />
                {favBuses.length === 0 ? <EmptyState label="즐겨찾기 버스 없음" /> : (
                  <div className="divide-y divide-[#F2F4F6]">
                    {favBuses.map(b => (
                      <div key={b.id} className="flex items-center gap-2 px-4 py-2">
                        <Star size={11} className="text-[#FFBB00] fill-[#FFBB00] shrink-0" />
                        <div>
                          <p className="text-[12px] font-bold text-[#191F28]">{b.route_name}</p>
                          {b.stop_name && <p className="text-[10px] text-[#B0B8C1]">정류장: {b.stop_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 즐겨찾기 상가 */}
                <SectionHeader label="즐겨찾기 상가" count={favStores.length} Icon={Building2} />
                {favStores.length === 0 ? <EmptyState label="즐겨찾기 상가 없음" /> : (
                  <div className="divide-y divide-[#F2F4F6]">
                    {favStores.map(s => (
                      <div key={s.id} className="flex items-center gap-2 px-4 py-2">
                        <Star size={11} className="text-[#FFBB00] fill-[#FFBB00] shrink-0" />
                        <div>
                          <p className="text-[12px] font-bold text-[#191F28]">{s.store_name}</p>
                          {s.building_name && <p className="text-[10px] text-[#B0B8C1]">{s.building_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 관심 아파트 */}
                <SectionHeader label="관심 아파트" count={favApts.length} Icon={Home} />
                {favApts.length === 0 ? <EmptyState label="관심 아파트 없음" /> : (
                  <div className="divide-y divide-[#F2F4F6]">
                    {favApts.map(a => (
                      <div key={a.id} className="flex items-center gap-2 px-4 py-2">
                        <Star size={11} className="text-[#FFBB00] fill-[#FFBB00] shrink-0" />
                        <div>
                          <p className="text-[12px] font-bold text-[#191F28]">{a.apt_name}</p>
                          {a.dong && <p className="text-[10px] text-[#B0B8C1]">{a.dong}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── 관리 로그 탭 ─────────────────────────── */}
          {detailTab === "log" && (
            isLoading ? <LoadingState /> : (
              logs.length === 0 ? <EmptyState label="관리 로그 없음" /> : (
                <div className="divide-y divide-[#F2F4F6]">
                  {logs.map(log => {
                    const meta = ACTION_META[log.action] ?? { label: log.action, color: "#8B95A1", Icon: Clock };
                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: meta.color + "20" }}>
                          <meta.Icon size={11} style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
                          {log.detail && <p className="text-[11px] text-[#4E5968] mt-0.5 leading-snug">{log.detail}</p>}
                          <p className="text-[10px] text-[#B0B8C1] mt-0.5">{fmtDateTime(log.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )
          )}

          {/* ── 로그인 이력 탭 ───────────────────────── */}
          {detailTab === "login" && (
            isLoading ? <LoadingState /> : (
              logins.length === 0 ? <EmptyState label="로그인 이력 없음" /> : (
                <div className="divide-y divide-[#F2F4F6]">
                  {logins.map(l => (
                    <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${l.success ? "bg-[#ECFDF5]" : "bg-[#FEF2F2]"}`}>
                        <LogIn size={11} className={l.success ? "text-[#059669]" : "text-[#DC2626]"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] font-bold ${l.success ? "text-[#059669]" : "text-[#DC2626]"}`}>
                            {l.success ? "성공" : "실패"}
                          </span>
                          <span className="text-[10px] bg-[#F2F4F6] text-[#8B95A1] px-1.5 py-0.5 rounded-full">{l.login_type}</span>
                          {!l.success && l.fail_reason && (
                            <span className="text-[10px] text-[#F04452]">{l.fail_reason}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#B0B8C1]">
                          <span>{fmtDateTime(l.login_at)}</span>
                          {l.ip_address && <span className="font-mono">{l.ip_address}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionHeader({ label, count, Icon }: { label: string; count: number; Icon: any }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8F9FB] border-t border-[#E5E8EB]">
      <Icon size={11} className="text-[#3182F6]" />
      <span className="text-[11px] font-extrabold text-[#4E5968]">{label}</span>
      <span className="text-[10px] text-[#8B95A1]">{count}건</span>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export default function AdminMembersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [search, setSearch]             = useState("");
  const [members, setMembers]           = useState<AdminMember[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [showSuspend, setShowSuspend]   = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showFilter, setShowFilter]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = periodToDate(periodFilter);
      const data = await adminFetchMembers({
        status:   statusFilter === "all" ? undefined : statusFilter,
        dateFrom: periodFilter === "custom" ? dateFrom || undefined : from,
        dateTo:   periodFilter === "custom" ? dateTo   || undefined : to,
      });
      setMembers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? members.filter(m =>
        (m.nickname ?? "").toLowerCase().includes(q) ||
        (m.dong ?? "").toLowerCase().includes(q) ||
        m.id.toLowerCase().startsWith(q))
    : members;

  const counts = {
    all:       members.length,
    active:    members.filter(m => m.status === "active").length,
    suspended: members.filter(m => m.status === "suspended").length,
    withdrawn: members.filter(m => m.status === "withdrawn").length,
  };

  function updateSelected(m: AdminMember) {
    setSelectedMember(m);
    setMembers(prev => prev.map(x => x.id === m.id ? m : x));
  }

  async function handleSuspendConfirm(until: string, reason: string) {
    if (!selectedMember) return;
    await adminSuspendMember(selectedMember.id, until, reason);
    const updated = { ...selectedMember, status: "suspended" as MemberStatus, suspended_until: until, suspended_reason: reason };
    updateSelected(updated);
    setShowSuspend(false);
  }

  async function handleUnsuspend() {
    if (!selectedMember) return;
    await adminUnsuspendMember(selectedMember.id);
    const updated = { ...selectedMember, status: "active" as MemberStatus, suspended_until: null, suspended_reason: null };
    updateSelected(updated);
  }

  async function handleWithdrawConfirm(reason: string) {
    if (!selectedMember) return;
    await adminWithdrawMember(selectedMember.id, reason);
    const updated = { ...selectedMember, status: "withdrawn" as MemberStatus, withdrawn_at: new Date().toISOString() };
    updateSelected(updated);
    setShowWithdraw(false);
  }

  const STATUS_TABS: { v: StatusFilter; label: string; color: string }[] = [
    { v: "all",       label: `전체 ${counts.all}`,       color: "#3182F6" },
    { v: "active",    label: `활성 ${counts.active}`,    color: "#059669" },
    { v: "suspended", label: `정지 ${counts.suspended}`, color: "#DC2626" },
    { v: "withdrawn", label: `탈퇴 ${counts.withdrawn}`, color: "#9333EA" },
  ];

  const PERIOD_OPTS: { v: PeriodFilter; label: string }[] = [
    { v: "all",    label: "전체 기간" },
    { v: "today",  label: "오늘"      },
    { v: "7d",     label: "최근 7일"  },
    { v: "30d",    label: "최근 30일" },
    { v: "90d",    label: "최근 90일" },
    { v: "custom", label: "직접 입력" },
  ];

  return (
    <div className="flex h-[calc(100dvh-52px)] md:h-screen overflow-hidden">

      {/* ── 왼쪽: 목록 패널 ─────────────────────────────── */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${selectedMember ? "hidden md:flex" : "flex"}`}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E8EB]">
          <div>
            <h1 className="text-[18px] font-extrabold text-[#191F28]">회원 관리</h1>
            <p className="text-[11px] text-[#8B95A1]">총 {members.length}명</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilter(v => !v)}
              className={`p-2 rounded-xl border transition-colors ${showFilter ? "border-[#3182F6] bg-[#F0F6FF] text-[#3182F6]" : "border-[#E5E8EB] text-[#8B95A1] hover:bg-[#F2F4F6]"}`}>
              <Filter size={15} />
            </button>
            <button onClick={load}
              className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6] text-[#8B95A1]">
              <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : ""} />
            </button>
          </div>
        </div>

        {/* 필터 영역 */}
        {showFilter && (
          <div className="bg-[#F8F9FB] border-b border-[#E5E8EB] px-4 py-3 space-y-2.5">
            {/* 기간 필터 */}
            <div>
              <p className="text-[11px] font-bold text-[#8B95A1] mb-1.5">가입 기간</p>
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_OPTS.map(o => (
                  <button key={o.v} onClick={() => setPeriodFilter(o.v)}
                    className={`px-3 py-1 rounded-lg text-[12px] font-semibold border transition-all ${
                      periodFilter === o.v
                        ? "bg-[#3182F6] text-white border-[#3182F6]"
                        : "bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#3182F6]"
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
              {periodFilter === "custom" && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="date" className="flex-1 border border-[#E5E8EB] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-[#3182F6]"
                    value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <span className="text-[12px] text-[#8B95A1]">~</span>
                  <input type="date" className="flex-1 border border-[#E5E8EB] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-[#3182F6]"
                    value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 상태 탭 */}
        <div className="flex gap-1.5 px-4 py-2.5 bg-white border-b border-[#E5E8EB] overflow-x-auto scrollbar-hide">
          {STATUS_TABS.map(t => (
            <button key={t.v} onClick={() => setStatusFilter(t.v)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${
                statusFilter === t.v ? "text-white" : "bg-[#F2F4F6] text-[#8B95A1] hover:bg-[#E5E8EB]"
              }`}
              style={statusFilter === t.v ? { background: t.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div className="px-4 py-2 bg-white border-b border-[#F2F4F6]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B8C1]" />
            <input
              className="w-full pl-9 pr-8 py-2 border border-[#E5E8EB] rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6] bg-[#F8F9FB]"
              placeholder="닉네임 · 동 · ID 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B0B8C1]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <RefreshCw size={20} className="animate-spin text-[#3182F6]" />
              <p className="text-[13px] text-[#B0B8C1]">회원 목록 불러오는 중...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users size={32} className="text-[#D1D5DB] mb-2" />
              <p className="text-[13px] text-[#B0B8C1]">해당 회원이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2F4F6]">
              {filtered.map(m => {
                const isSuspExpired = m.status === "suspended" && m.suspended_until && new Date(m.suspended_until) < new Date();
                const effectiveStatus: MemberStatus = isSuspExpired ? "active" : m.status;
                return (
                  <button key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[#F8F9FB] transition-colors ${
                      selectedMember?.id === m.id ? "bg-[#F0F6FF]" : "bg-white"
                    }`}>
                    {/* 아바타 */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-[13px] font-extrabold ${
                      effectiveStatus === "active" ? "bg-[#3182F6]"
                        : effectiveStatus === "suspended" ? "bg-[#DC2626]"
                        : "bg-[#9CA3AF]"
                    }`}>
                      {(m.nickname ?? "?")[0]}
                    </div>
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[13px] font-bold text-[#191F28] truncate">{m.nickname || "이름없음"}</p>
                        <span className="shrink-0 text-[11px] text-[#B0B8C1]">{m.dong}</span>
                        {statusBadge(m)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#8B95A1]">
                        <span>{m.level}</span>
                        <span>·</span>
                        <span className="text-[#3182F6] font-medium">{(m.points ?? 0).toLocaleString()}P</span>
                        <span>·</span>
                        <span>글 {m.post_count} 댓 {m.comment_count}</span>
                        <span className="ml-auto shrink-0">{relativeTime(m.last_active_at) ?? fmtDate(m.joined_at)}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#D1D5DB] shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 오른쪽: 상세 패널 ─────────────────────────── */}
      {selectedMember && (
        <div className={`flex-col border-l border-[#E5E8EB] bg-[#F5F6F8]
          w-full md:w-[380px] md:shrink-0
          ${selectedMember ? "flex" : "hidden md:flex"}`}>
          <MemberDetail
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onMemberUpdate={updateSelected}
            onSuspend={() => setShowSuspend(true)}
            onUnsuspend={handleUnsuspend}
            onWithdraw={() => setShowWithdraw(true)}
          />
        </div>
      )}

      {/* 모달들 */}
      {showSuspend && selectedMember && (
        <SuspendModal
          member={selectedMember}
          onClose={() => setShowSuspend(false)}
          onConfirm={handleSuspendConfirm}
        />
      )}
      {showWithdraw && selectedMember && (
        <WithdrawModal
          member={selectedMember}
          onClose={() => setShowWithdraw(false)}
          onConfirm={handleWithdrawConfirm}
        />
      )}
    </div>
  );
}
