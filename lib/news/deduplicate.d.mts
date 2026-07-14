export interface NewsIssueArticle {
  title: string;
  summary?: string | null;
  source?: string | null;
  publishedAt?: string | null;
  published_at?: string | null;
  thumbnail?: string | null;
  url?: string | null;
}

export interface NewsDeduplicationOptions {
  limit?: number;
  maxPerSource?: number;
  maxHours?: number;
}

export interface NewsIssueCluster<T> {
  article: T;
  members: T[];
  newestTimestamp: number;
}

export function normalizeNewsHeadline(title?: string): string;
export function isSameNewsIssue<T extends NewsIssueArticle>(
  first: T,
  second: T,
  options?: NewsDeduplicationOptions,
): boolean;
export function clusterNewsArticles<T extends NewsIssueArticle>(
  articles: T[],
  options?: NewsDeduplicationOptions,
): Array<NewsIssueCluster<T>>;
export function deduplicateNewsArticles<T extends NewsIssueArticle>(
  articles: T[],
  options?: NewsDeduplicationOptions,
): T[];
