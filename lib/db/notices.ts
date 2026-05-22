/**
 * lib/db/notices.ts — 공지사항 CRUD
 * Uses /api/admin/db route for writes, Supabase client for reads
 * Table: notices
 * id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
 * image_url TEXT, is_pinned BOOLEAN DEFAULT FALSE,
 * created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
 */
import { supabase } from "@/lib/supabase";

export interface Notice {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchNotices(): Promise<Notice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[notices] fetchNotices error", error);
    return [];
  }
  return (data ?? []) as Notice[];
}

export async function fetchNoticeById(id: string): Promise<Notice | null> {
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("[notices] fetchNoticeById error", error);
    return null;
  }
  return data as Notice;
}

export async function adminUpsertNotice(notice: Partial<Notice> & { id: string }): Promise<void> {
  const res = await fetch("/api/admin/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: "notices",
      method: "POST",
      rows: [{ ...notice, updated_at: new Date().toISOString() }],
      onConflict: "id",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

export async function adminDeleteNotice(id: string): Promise<void> {
  const res = await fetch("/api/admin/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: "notices",
      method: "DELETE",
      eq: `id=eq.${id}`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}
