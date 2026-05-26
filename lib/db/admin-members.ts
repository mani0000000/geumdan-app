import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export type MemberStatus = "active" | "suspended" | "withdrawn";

export interface AdminMember {
  id: string;
  nickname: string | null;
  dong: string | null;
  level: string | null;
  status: MemberStatus;
  suspended_until: string | null;
  suspended_reason: string | null;
  withdrawn_at: string | null;
  admin_notes: string;
  joined_at: string;
  last_active_at: string | null;
  updated_at: string | null;
  points: number;
  post_count: number;
  comment_count: number;
  // legacy compat (탈퇴 회원 구 필드)
  deleted_at?: string | null;
  deletion_reason?: string | null;
  deleted_points?: number | null;
  deleted_coupon_count?: number | null;
}

export interface MemberLog {
  id: string;
  user_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface LoginHistory {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  login_type: string;
  success: boolean;
  fail_reason: string | null;
}

export interface MemberFilter {
  status?: MemberStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

const SELECT =
  "id,nickname,dong,level,status,suspended_until,suspended_reason,withdrawn_at," +
  "admin_notes,joined_at,last_active_at,updated_at,points,post_count,comment_count";

export async function adminFetchMembers(filter?: MemberFilter): Promise<AdminMember[]> {
  const conds: string[] = [];
  if (filter?.status && filter.status !== "all") conds.push(`status=eq.${filter.status}`);
  if (filter?.dateFrom) conds.push(`joined_at=gte.${filter.dateFrom}`);
  if (filter?.dateTo)   conds.push(`joined_at=lte.${filter.dateTo}T23:59:59`);

  return adminApiGet<AdminMember>("users", {
    select: SELECT,
    order: "joined_at.desc",
    eq: conds.length > 0 ? conds.join("&") : undefined,
    limit: 1000,
  });
}

// 레거시 호환
export async function adminFetchActiveMembers(): Promise<AdminMember[]> {
  return adminFetchMembers({ status: "active" });
}
export async function adminFetchDeletedMembers(): Promise<AdminMember[]> {
  return adminFetchMembers({ status: "withdrawn" });
}

export async function adminSuspendMember(
  userId: string,
  until: string,
  reason: string,
): Promise<void> {
  await adminApiPost("users", "PATCH",
    { status: "suspended", suspended_until: until, suspended_reason: reason },
    { eq: `id=eq.${userId}` },
  );
  await adminApiPost("admin_member_logs", "POST", [{
    user_id: userId,
    action: "suspend",
    detail: `정지 해제일: ${until.slice(0, 10)}, 사유: ${reason}`,
  }]);
}

export async function adminUnsuspendMember(userId: string): Promise<void> {
  await adminApiPost("users", "PATCH",
    { status: "active", suspended_until: null, suspended_reason: null },
    { eq: `id=eq.${userId}` },
  );
  await adminApiPost("admin_member_logs", "POST", [{
    user_id: userId,
    action: "unsuspend",
    detail: "관리자가 정지를 해제하였습니다.",
  }]);
}

export async function adminWithdrawMember(userId: string, reason: string): Promise<void> {
  await adminApiPost("users", "PATCH",
    { status: "withdrawn", withdrawn_at: new Date().toISOString() },
    { eq: `id=eq.${userId}` },
  );
  await adminApiPost("admin_member_logs", "POST", [{
    user_id: userId,
    action: "withdraw",
    detail: `강제탈퇴 처리. 사유: ${reason}`,
  }]);
}

export async function adminUpdateMemberNotes(userId: string, notes: string): Promise<void> {
  await adminApiPost("users", "PATCH",
    { admin_notes: notes },
    { eq: `id=eq.${userId}` },
  );
  if (notes.trim()) {
    await adminApiPost("admin_member_logs", "POST", [{
      user_id: userId,
      action: "note",
      detail: notes.slice(0, 200),
    }]);
  }
}

export async function adminFetchMemberLogs(userId: string): Promise<MemberLog[]> {
  return adminApiGet<MemberLog>("admin_member_logs", {
    select: "id,user_id,action,detail,created_at",
    order: "created_at.desc",
    eq: `user_id=eq.${userId}`,
    limit: 100,
  });
}

export async function adminFetchLoginHistory(userId: string): Promise<LoginHistory[]> {
  return adminApiGet<LoginHistory>("user_login_history", {
    select: "id,user_id,login_at,ip_address,login_type,success,fail_reason",
    order: "login_at.desc",
    eq: `user_id=eq.${userId}`,
    limit: 50,
  });
}

// ── 회원 상세 데이터 (보안 전용 엔드포인트 경유) ─────────────────────────
export interface MemberCoupon {
  id: string;
  coupon_id: string;
  store_name: string;
  title: string;
  discount: string;
  expiry: string;
  status: string;
  downloaded_at: string;
}

export interface MemberPointRecord {
  id: string;
  points: number;
  desc_text: string;
  created_at: string;
}

export interface MemberPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  like_count: number;
  comment_count: number;
}

export interface MemberComment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
}

export interface MemberSavedPost {
  id: string;
  post_id: string;
  title: string;
  category: string;
  created_at: string;
}

export interface MemberFavBus   { id: string; route_id: string; route_name: string; stop_name: string | null; created_at: string }
export interface MemberFavStore { id: string; store_id: string; store_name: string; building_name: string | null; created_at: string }
export interface MemberFavApt   { id: string; apt_id: string;   apt_name: string;   dong: string | null; created_at: string }

async function fetchMemberDetail<T>(userId: string, type: string): Promise<T[]> {
  try {
    const res = await fetch(
      `/api/admin/member-detail?userId=${encodeURIComponent(userId)}&type=${type}`,
      { credentials: "include" },  // httpOnly 쿠키 전송
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as T[];
  } catch {
    return [];
  }
}

export const adminFetchMemberCoupons    = (uid: string) => fetchMemberDetail<MemberCoupon>(uid, "coupons");
export const adminFetchMemberPoints     = (uid: string) => fetchMemberDetail<MemberPointRecord>(uid, "points");
export const adminFetchMemberPosts      = (uid: string) => fetchMemberDetail<MemberPost>(uid, "posts");
export const adminFetchMemberComments   = (uid: string) => fetchMemberDetail<MemberComment>(uid, "comments");
export const adminFetchMemberSavedPosts = (uid: string) => fetchMemberDetail<MemberSavedPost>(uid, "saved_posts");
export const adminFetchMemberFavBuses   = (uid: string) => fetchMemberDetail<MemberFavBus>(uid, "fav_buses");
export const adminFetchMemberFavStores  = (uid: string) => fetchMemberDetail<MemberFavStore>(uid, "fav_stores");
export const adminFetchMemberFavApts    = (uid: string) => fetchMemberDetail<MemberFavApt>(uid, "fav_apts");
