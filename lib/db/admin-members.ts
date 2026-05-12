import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export type MemberStatus = "active" | "suspended" | "withdrawn";

export interface AdminMember {
  id: string;
  nickname: string;
  dong: string | null;
  avatar_url: string | null;
  email: string | null;
  status: MemberStatus;
  suspended_until: string | null;
  withdrawn_at: string | null;
  admin_notes: string;
  level: string;
  points: number;
  joined_at: string;
  last_active_at: string | null;
  updated_at: string | null;
  post_count: number;
  comment_count: number;
  received_like_count: number;
  last_activity_at: string | null;
}

export interface AdminMemberPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
}

export interface AdminMemberComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
}

/** 회원 목록 — user_activity_stats 뷰 우선, 실패 시 users 테이블 폴백 */
export async function adminFetchMembers(opts: {
  status?: "all" | MemberStatus;
  search?: string;
  limit?: number;
} = {}): Promise<AdminMember[]> {
  try {
    const rows = await adminApiGet<AdminMember>("user_activity_stats", {
      order: "joined_at.desc",
      limit: opts.limit ?? 500,
    });
    return filterMembers(rows, opts);
  } catch {
    // 뷰 미지원 환경: users 테이블에서 직접 + 카운트 0으로 폴백
    const rows = await adminApiGet<Record<string, unknown>>("users", {
      order: "joined_at.desc",
      limit: opts.limit ?? 500,
    });
    const fallback = rows.map(r => ({
      id: r.id as string,
      nickname: (r.nickname as string) ?? "",
      dong: (r.dong as string | null) ?? null,
      avatar_url: (r.avatar_url as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      status: ((r.status as MemberStatus) ?? "active"),
      suspended_until: (r.suspended_until as string | null) ?? null,
      withdrawn_at: (r.withdrawn_at as string | null) ?? null,
      admin_notes: (r.admin_notes as string) ?? "",
      level: (r.level as string) ?? "새싹",
      points: (r.points as number) ?? 0,
      joined_at: (r.joined_at as string) ?? "",
      last_active_at: (r.last_active_at as string | null) ?? null,
      updated_at: (r.updated_at as string | null) ?? null,
      post_count: (r.post_count as number) ?? 0,
      comment_count: (r.comment_count as number) ?? 0,
      received_like_count: (r.like_count as number) ?? 0,
      last_activity_at: (r.last_active_at as string | null) ?? null,
    } satisfies AdminMember));
    return filterMembers(fallback, opts);
  }
}

function filterMembers(rows: AdminMember[], opts: { status?: "all" | MemberStatus; search?: string }) {
  const now = Date.now();
  let out = rows.map(r => {
    // 정지 만료 자동 보정
    if (
      r.status === "suspended" &&
      r.suspended_until &&
      new Date(r.suspended_until).getTime() < now
    ) {
      return { ...r, status: "active" as MemberStatus };
    }
    return r;
  });
  if (opts.status && opts.status !== "all") {
    out = out.filter(r => r.status === opts.status);
  }
  const q = opts.search?.trim().toLowerCase();
  if (q) {
    out = out.filter(r =>
      r.nickname.toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }
  return out;
}

export interface MemberStats {
  total: number;
  active: number;
  suspended: number;
  withdrawn: number;
  joinedToday: number;
}

export async function adminFetchMemberStats(): Promise<MemberStats> {
  const rows = await adminApiGet<{ status: MemberStatus; joined_at: string }>("users", {
    select: "status,joined_at",
    limit: 5000,
  });
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: rows.length,
    active: rows.filter(r => r.status === "active").length,
    suspended: rows.filter(r => r.status === "suspended").length,
    withdrawn: rows.filter(r => r.status === "withdrawn").length,
    joinedToday: rows.filter(r => (r.joined_at ?? "").startsWith(today)).length,
  };
}

export async function adminUpdateMember(
  id: string,
  patch: Partial<Pick<AdminMember,
    "status" | "suspended_until" | "withdrawn_at" | "admin_notes" | "nickname" | "dong" | "level"
  >>
): Promise<void> {
  await adminApiPost("users", "PATCH", { ...patch, updated_at: new Date().toISOString() }, {
    eq: `id=eq.${id}`,
  });
}

export async function adminSuspendMember(id: string, days: number, reason?: string): Promise<void> {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  await adminUpdateMember(id, {
    status: "suspended",
    suspended_until: until,
  });
  if (reason !== undefined) {
    await adminApiPost("users", "PATCH",
      { suspended_reason: reason, updated_at: new Date().toISOString() },
      { eq: `id=eq.${id}` }
    );
  }
  void logMemberAction(id, "suspend", `${days}일 정지${reason ? ` — ${reason}` : ""}`);
}

export async function adminUnsuspendMember(id: string): Promise<void> {
  await adminUpdateMember(id, {
    status: "active",
    suspended_until: null,
  });
  void logMemberAction(id, "unsuspend", "정지 해제");
}

export async function adminWithdrawMember(id: string, reason?: string): Promise<void> {
  await adminUpdateMember(id, {
    status: "withdrawn",
    withdrawn_at: new Date().toISOString(),
  });
  void logMemberAction(id, "withdraw", reason ?? "강제 탈퇴");
}

export async function adminRestoreMember(id: string): Promise<void> {
  await adminUpdateMember(id, {
    status: "active",
    withdrawn_at: null,
  });
  void logMemberAction(id, "restore", "복구");
}

export async function adminUpdateMemberNotes(id: string, notes: string): Promise<void> {
  await adminUpdateMember(id, { admin_notes: notes });
  void logMemberAction(id, "note", notes.slice(0, 80));
}

async function logMemberAction(userId: string, action: string, detail: string) {
  try {
    await adminApiPost("admin_member_logs", "POST",
      [{ user_id: userId, action, detail }],
      {}
    );
  } catch { /* 로그 테이블 없을 시 무시 */ }
}

export async function adminFetchMemberPosts(userId: string, limit = 5): Promise<AdminMemberPost[]> {
  return adminApiGet<AdminMemberPost>("community_posts", {
    select: "id,title,category,created_at,view_count,like_count,comment_count",
    order: "created_at.desc",
    eq: `user_id=eq.${userId}`,
    limit,
  });
}

export async function adminFetchMemberComments(userId: string, limit = 5): Promise<AdminMemberComment[]> {
  return adminApiGet<AdminMemberComment>("community_comments", {
    select: "id,post_id,content,created_at",
    order: "created_at.desc",
    eq: `user_id=eq.${userId}`,
    limit,
  });
}

export interface AdminMemberLoginHistory {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  login_type: string;
  success: boolean;
  fail_reason: string | null;
}

export async function adminFetchMemberLoginHistory(userId: string, limit = 10): Promise<AdminMemberLoginHistory[]> {
  return adminApiGet<AdminMemberLoginHistory>("user_login_history", {
    select: "id,user_id,login_at,ip_address,login_type,success,fail_reason",
    order: "login_at.desc",
    eq: `user_id=eq.${userId}`,
    limit,
  });
}
