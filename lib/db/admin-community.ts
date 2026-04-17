import { supabaseAdmin } from "@/lib/supabase-admin";

export interface AdminPost {
  id: string;
  category: string;
  title: string;
  content: string;
  author: string;
  author_dong: string;
  is_anonymous: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_hot: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminComment {
  id: string;
  post_id: string;
  author: string;
  author_dong: string;
  content: string;
  like_count: number;
  is_anonymous: boolean;
  created_at: string;
}

export async function adminFetchPosts(opts?: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<AdminPost[]> {
  let q = supabaseAdmin
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (opts?.category && opts.category !== "전체") {
    q = q.eq("category", opts.category);
  }
  if (opts?.search?.trim()) {
    q = q.or(`title.ilike.%${opts.search}%,content.ilike.%${opts.search}%,author.ilike.%${opts.search}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPost[];
}

export async function adminUpdatePost(
  id: string,
  data: Partial<Pick<AdminPost, "is_pinned" | "is_hot" | "category" | "title" | "content">>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("community_posts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeletePost(id: string): Promise<void> {
  // 댓글 먼저 삭제
  await supabaseAdmin.from("community_comments").delete().eq("post_id", id);
  const { error } = await supabaseAdmin.from("community_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminFetchComments(postId: string): Promise<AdminComment[]> {
  const { data, error } = await supabaseAdmin
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminComment[];
}

export async function adminDeleteComment(id: string, postId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("community_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // comment_count 동기화
  const { count } = await supabaseAdmin
    .from("community_comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  await supabaseAdmin
    .from("community_posts")
    .update({ comment_count: count ?? 0 })
    .eq("id", postId);
}

export async function adminFetchStats(): Promise<{
  totalPosts: number;
  todayPosts: number;
  totalComments: number;
  pinnedCount: number;
  hotCount: number;
}> {
  const today = new Date().toISOString().slice(0, 10);

  const [posts, todayPosts, comments, pinned, hot] = await Promise.all([
    supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }).gte("created_at", today),
    supabaseAdmin.from("community_comments").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }).eq("is_pinned", true),
    supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }).eq("is_hot", true),
  ]);

  return {
    totalPosts: posts.count ?? 0,
    todayPosts: todayPosts.count ?? 0,
    totalComments: comments.count ?? 0,
    pinnedCount: pinned.count ?? 0,
    hotCount: hot.count ?? 0,
  };
}
