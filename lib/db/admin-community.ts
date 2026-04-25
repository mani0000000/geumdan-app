import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

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
  limit?: number;
}): Promise<AdminPost[]> {
  return adminApiGet<AdminPost>("community_posts", {
    order: "created_at.desc",
    limit: opts?.limit ?? 200,
    eq: opts?.category && opts.category !== "전체" ? `category=eq.${opts.category}` : undefined,
  });
}

export async function adminUpdatePost(
  id: string,
  data: Partial<Pick<AdminPost, "is_pinned" | "is_hot" | "category" | "title" | "content">>
): Promise<void> {
  await adminApiPost("community_posts", "PATCH", { ...data, updated_at: new Date().toISOString() }, { eq: `id=eq.${id}` });
}

export async function adminDeletePost(id: string): Promise<void> {
  await adminApiPost("community_comments", "DELETE", null, { eq: `post_id=eq.${id}` });
  await adminApiPost("community_posts", "DELETE", null, { eq: `id=eq.${id}` });
}

export async function adminFetchComments(postId: string): Promise<AdminComment[]> {
  return adminApiGet<AdminComment>("community_comments", {
    order: "created_at",
    eq: `post_id=eq.${postId}`,
  });
}

export async function adminDeleteComment(id: string, _postId?: string): Promise<void> {
  await adminApiPost("community_comments", "DELETE", null, { eq: `id=eq.${id}` });
}

export async function adminFetchStats(): Promise<{
  totalPosts: number;
  todayPosts: number;
  totalComments: number;
  pinnedCount: number;
  hotCount: number;
}> {
  const [posts, comments] = await Promise.all([
    adminApiGet<AdminPost>("community_posts", { select: "id,is_pinned,is_hot,created_at" }),
    adminApiGet<AdminComment>("community_comments", { select: "id" }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalPosts: posts.length,
    todayPosts: posts.filter(p => p.created_at.startsWith(today)).length,
    totalComments: comments.length,
    pinnedCount: posts.filter(p => p.is_pinned).length,
    hotCount: posts.filter(p => p.is_hot).length,
  };
}
