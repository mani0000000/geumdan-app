const GOOGLE_NEWS_HOSTS = new Set(["news.google.com", "news.google.co.kr"]);
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isGoogleNewsUrl(value) {
  try {
    return GOOGLE_NEWS_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function articleIdFromUrl(value) {
  try {
    const parts = new URL(value).pathname.split("/").filter(Boolean);
    return parts.at(-1) || "";
  } catch {
    return "";
  }
}

function decodeHtmlAttribute(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/g, "&")
    .replace(/&#x3d;|&#61;/gi, "=")
    .replace(/&quot;|&#34;/gi, '"');
}

function extractGoogleThumbnail(html) {
  const candidates = html.match(/https:\/\/lh[3-6]\.googleusercontent\.com\/[A-Za-z0-9_?&=./%-]+/g) || [];
  const articleCandidates = candidates.filter(url =>
    !url.includes("-DR60l-K8vnyi99NZovm9HlXyZwQ85GMDxiwJWzo")
    && !url.includes("J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7"),
  );
  const preferred = articleCandidates.find(url => /(?:=|-)s0-w(?:300|400|600)(?:-|$)/.test(url))
    || articleCandidates.find(url => /=w(?:300|400|600)/.test(url));
  return preferred ? decodeHtmlAttribute(preferred) : null;
}

function parseBatchResponse(body) {
  const chunks = body.split("\n\n").map(chunk => chunk.trim()).filter(Boolean);
  for (const chunk of chunks) {
    if (!chunk.startsWith("[")) continue;
    try {
      const envelopes = JSON.parse(chunk);
      for (const envelope of envelopes) {
        const encoded = envelope?.[2];
        if (typeof encoded !== "string") continue;
        const decoded = JSON.parse(encoded);
        const candidate = decoded?.[1];
        if (typeof candidate === "string" && isHttpUrl(candidate) && !isGoogleNewsUrl(candidate)) {
          return candidate;
        }
      }
    } catch {
      // Google 응답 앞부분의 보안 프리픽스/길이 행은 JSON이 아니므로 건너뛴다.
    }
  }
  return null;
}

/**
 * Google News RSS 중계 URL을 실제 언론사 URL로 복원한다.
 * 페이지가 제공하는 서명/타임스탬프를 batchexecute에 전달하고,
 * 복원이 막혀도 Google이 보유한 기사 썸네일은 폴백으로 반환한다.
 */
export async function resolveGoogleNewsArticle(value, options = {}) {
  if (!isGoogleNewsUrl(value)) return { url: value, thumbnail: null };

  const articleId = articleIdFromUrl(value);
  if (!articleId) return { url: value, thumbnail: null };

  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const pageResponse = await fetch(`https://news.google.com/articles/${articleId}?hl=ko&gl=KR&ceid=KR:ko`, {
      headers: { "User-Agent": DEFAULT_USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!pageResponse.ok) return { url: value, thumbnail: null };

    const html = await pageResponse.text();
    const signature = html.match(/data-n-a-sg=["']([^"']+)["']/)?.[1];
    const timestamp = html.match(/data-n-a-ts=["']([^"']+)["']/)?.[1];
    const thumbnail = extractGoogleThumbnail(html);
    if (!signature || !timestamp) return { url: value, thumbnail };

    const requestPayload = [
      "Fbv4je",
      JSON.stringify([
        "garturlreq",
        [["X", "X", ["X", "X"], null, null, 1, 1, "KR:ko", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
        articleId,
        Number(timestamp),
        signature,
      ]),
      null,
      "generic",
    ];
    const body = new URLSearchParams({ "f.req": JSON.stringify([[requestPayload]]) });
    const batchResponse = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": DEFAULT_USER_AGENT,
      },
      body,
      signal: controller.signal,
    });
    if (!batchResponse.ok) return { url: value, thumbnail };

    const resolvedUrl = parseBatchResponse(await batchResponse.text());
    return { url: resolvedUrl || value, thumbnail };
  } catch {
    return { url: value, thumbnail: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
