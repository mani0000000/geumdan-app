import { adminApiGet } from "@/lib/db/admin-api";

export interface AdminMember {
  id: string;
  nickname: string;
  dong: string;
  level: string;
  joined_at: string;
  points: number;
  post_count: number;
  comment_count: number;
  deleted_at: string | null;
  deletion_reason: string | null;
  deleted_points: number | null;
  deleted_coupon_count: number | null;
}

const SELECT =
  "id,nickname,dong,level,joined_at,points,post_count,comment_count," +
  "deleted_at,deletion_reason,deleted_points,deleted_coupon_count";

/** 활성 회원 (deleted_at IS NULL) */
export async function adminFetchActiveMembers(): Promise<AdminMember[]> {
  return adminApiGet<AdminMember>("users", {
    select: SELECT,
    order: "joined_at.desc",
    eq: "deleted_at=is.null",
    limit: 500,
  });
}

/** 탈퇴 회원 (deleted_at IS NOT NULL) */
export async function adminFetchDeletedMembers(): Promise<AdminMember[]> {
  return adminApiGet<AdminMember>("users", {
    select: SELECT,
    order: "deleted_at.desc",
    eq: "deleted_at=not.is.null",
    limit: 500,
  });
}
