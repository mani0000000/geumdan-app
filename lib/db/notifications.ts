/**
 * notifications Supabase CRUD
 *
 * 알림 타입:
 *  - coupon_expiry  : 쿠폰 만료 D-3, D-1 알림
 *  - post_like      : 내 글에 좋아요
 *  - post_comment   : 내 글에 댓글
 *  - comment_reply  : 내 댓글에 답글
 *
 * 마이그레이션: supabase/migrations/20260507_notifications.sql
 */

import { supabase } from "@/lib/supabase";

export type NotificationType =
  | "coupon_expiry"
  | "post_like"
  | "post_comment"
  | "comment_reply";

export interface AppNotification {
  id:           string;
  userId:       string;
  type:         NotificationType;
  title:        string;
  body:         string;
  isRead:       boolean;
  relatedId:    string | null;
  relatedType:  string | null;
  createdAt:    string;
}

interface NotificationRow {
  id:            string;
  user_id:       string;
  type:          NotificationType;
  title:         string;
  body:          string | null;
  is_read:       boolean;
  related_id:    string | null;
  related_type:  string | null;
  created_at:    string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id:          row.id,
    userId:      row.user_id,
    type:        row.type,
    title:       row.title,
    body:        row.body ?? "",
    isRead:      row.is_read,
    relatedId:   row.related_id,
    relatedType: row.related_type,
    createdAt:   row.created_at,
  };
}

// ── 목록 조회 ────────────────────────────────────────────────
export async function fetchNotifications(
  userId: string,
  limit = 50,
): Promise<AppNotification[]> {
  if (!isConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as NotificationRow[]).map(rowToNotification);
  } catch (e) {
    console.error("[notifications] fetchNotifications error:", e);
    return [];
  }
}

// ── 안읽은 개수 ──────────────────────────────────────────────
export async function fetchUnreadCount(userId: string): Promise<number> {
  if (!isConfigured() || !userId) return 0;
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    console.error("[notifications] fetchUnreadCount error:", e);
    return 0;
  }
}

// ── 알림 생성 ────────────────────────────────────────────────
export interface NotificationInput {
  userId:       string;
  type:         NotificationType;
  title:        string;
  body?:        string;
  relatedId?:   string;
  relatedType?: string;
}

export async function createNotification(
  input: NotificationInput,
): Promise<AppNotification | null> {
  if (!isConfigured() || !input.userId) return null;
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id:      input.userId,
        type:         input.type,
        title:        input.title,
        body:         input.body ?? "",
        related_id:   input.relatedId ?? null,
        related_type: input.relatedType ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToNotification(data as NotificationRow);
  } catch (e) {
    console.error("[notifications] createNotification error:", e);
    return null;
  }
}

// ── 읽음 처리 ────────────────────────────────────────────────
export async function markAsRead(id: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  } catch { /* silent */ }
}

// ── 전체 읽음 처리 ───────────────────────────────────────────
export async function markAllAsRead(userId: string): Promise<void> {
  if (!isConfigured() || !userId) return;
  try {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  } catch { /* silent */ }
}

// ── 삭제 ─────────────────────────────────────────────────────
export async function deleteNotification(id: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    await supabase
      .from("notifications")
      .delete()
      .eq("id", id);
  } catch { /* silent */ }
}
