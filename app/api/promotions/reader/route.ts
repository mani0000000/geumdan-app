import { supabase, supabaseUrl } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CSP = [
  "default-src 'none'", "img-src https: data:", "style-src https: 'unsafe-inline'",
  "font-src https: data:", "media-src https:", "connect-src 'none'", "frame-src 'none'",
  "script-src 'none'", "form-action 'none'", "base-uri https:", "frame-ancestors 'self'",
].join("; ");

function response(body: string, status = 200) {
  return new Response(body, { status, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": CSP,
    "Cache-Control": status === 200 ? "public, s-maxage=21600, stale-while-revalidate=86400" : "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  }});
}

function errorDocument(message: string) {
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f5f6f8;color:#172033;font:14px/1.65 -apple-system,BlinkMacSystemFont,"Pretendard",sans-serif}.box{min-height:100vh;display:grid;place-content:center;text-align:center;padding:28px}.icon{font-size:36px}.title{margin:12px 0 4px;font-size:16px;font-weight:800}.desc{margin:0;color:#718096}</style><main class="box"><div class="icon">🎁</div><p class="title">공식 행사 화면을 준비하지 못했어요</p><p class="desc">${message}</p></main></html>`;
}

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return null;
    if (url.protocol === "http:") url.protocol = "https:";
    return url;
  } catch { return null; }
}

function sanitize(html: string, source: URL) {
  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(?:iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed|form)\s*>/gi, "")
    .replace(/<(?:iframe|object|embed|form)\b[^>]*\/?\s*>/gi, "")
    .replace(/<meta\b[^>]+http-equiv=["']?(?:content-security-policy|refresh)["']?[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "href=\"#\"");
  const head = `<base href="${source.origin}/"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1">`;
  return /<head\b[^>]*>/i.test(cleaned)
    ? cleaned.replace(/<head\b([^>]*)>/i, `<head$1>${head}`)
    : `<!doctype html><html lang="ko"><head>${head}</head><body>${cleaned}</body></html>`;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.slice(0, 80);
  if (!id) return response(errorDocument("잘못된 행사 주소입니다."), 400);
  const { data, error } = await supabase.from("brand_promotions").select("source_url").eq("id", id).eq("active", true).maybeSingle();
  let sourceUrl = data?.source_url;
  if (error || !sourceUrl) {
    const fallbackKey = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
    const query = new URL(`${supabaseUrl}/rest/v1/brand_promotions`);
    query.searchParams.set("select", "source_url");
    query.searchParams.set("id", `eq.${id}`);
    query.searchParams.set("active", "eq.true");
    query.searchParams.set("limit", "1");
    const fallback = await fetch(query, { headers: { apikey: fallbackKey }, cache: "no-store" });
    if (fallback.ok) sourceUrl = (await fallback.json())?.[0]?.source_url;
  }
  const target = sourceUrl ? safeUrl(sourceUrl) : null;
  if (!target) return response(errorDocument("등록된 브랜드 행사만 앱 안에서 볼 수 있어요."), 403);
  try {
    const upstream = await fetch(target, { redirect: "follow", signal: AbortSignal.timeout(12_000), headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      "Accept-Language": "ko-KR,ko;q=0.9",
    }});
    if (!upstream.ok || !(upstream.headers.get("content-type") || "").includes("html")) return response(errorDocument("브랜드 홈페이지 응답이 원활하지 않습니다. 상단 외부 열기 버튼을 이용해 주세요."), 502);
    return response(sanitize((await upstream.text()).slice(0, 2_500_000), new URL(upstream.url)));
  } catch {
    return response(errorDocument("공식 홈페이지 연결이 지연되고 있어요."), 504);
  }
}
