#!/usr/bin/env node
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function makeFetch(key) {
  return (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.includes("/rest/v1/")) return fetch(input, init);
    const headers = new Headers(init?.headers);
    if (headers.get("Authorization")?.slice(7) === key && key.startsWith("sb_")) headers.delete("Authorization");
    return fetch(input, { ...init, headers });
  };
}

let supabase;

const PROMOTION_WORDS = /(할인|증정|쿠폰|이벤트|행사|혜택|특가|무료|1\s*\+\s*1|2\s*\+\s*1|sale|event|promotion|benefit|coupon|gift|new)/i;
const GENERIC_TITLE = /^(바로가기|자세히\s*보기|공지사항|기업뉴스|이벤트|진행중(?:인)?\s*이벤트(?:\s.*)?|종료(?:된)?\s*이벤트|지난\s*프로모션|공식\s*이벤트|행사\s*상품|event|promotion|news|notice|payment|what'?s new|starbucks|메가mgc커피|404)(\s*[|\-].*)?$/i;

// 매장 DB에 실제 입점한 브랜드만 출처로 자동 보강한다. 어드민에서 이미
// 관리 중인 출처는 덮어쓰지 않고, 누락된 공식 출처만 추가한다.
const REGISTERED_FRANCHISE_SOURCES = [
  { id: "gongcha", match: /공차/, brand_name: "공차", homepage_url: "https://www.gong-cha.co.kr", event_url: "https://www.gong-cha.co.kr/brand/board/event.php", brand_color: "#B79A6E", category: "카페", priority: 16 },
  { id: "dunkin", match: /던킨/, brand_name: "던킨", homepage_url: "https://www.dunkindonuts.co.kr", event_url: "https://www.dunkindonuts.co.kr/event?flag=A", brand_color: "#E11383", category: "디저트", priority: 23 },
  { id: "lotteeatz", match: /롯데리아|크리스피크림/, brand_name: "롯데리아·크리스피크림", homepage_url: "https://www.lotteeatz.com", event_url: "https://www.lotteeatz.com/event/main", brand_color: "#DA291C", category: "외식", priority: 29 },
  { id: "hansot", match: /한솥도시락/, brand_name: "한솥", homepage_url: "https://www.hsd.co.kr", event_url: "https://www.hsd.co.kr/event/event_list", brand_color: "#F58220", category: "외식", priority: 33 },
  { id: "theventi", match: /더벤티/, brand_name: "더벤티", homepage_url: "https://www.theventi.co.kr", event_url: "https://www.theventi.co.kr/new2022/news/news.html", brand_color: "#6E2B8F", category: "카페", priority: 17 },
  { id: "tomntoms", match: /탐앤탐스/, brand_name: "탐앤탐스", homepage_url: "https://www.tomntoms.com", event_url: "https://www.tomntoms.com/notice/event", brand_color: "#5A2D23", category: "카페", priority: 18 },
  { id: "tenpercent", match: /텐퍼센트커피/, brand_name: "텐퍼센트커피", homepage_url: "https://www.tenpercentcoffee.com", event_url: "https://www.tenpercentcoffee.com", brand_color: "#111111", category: "카페", priority: 19 },
  { id: "sulbing", match: /설빙/, brand_name: "설빙", homepage_url: "https://sulbing.com", event_url: "https://sulbing.com", brand_color: "#8B5E3C", category: "디저트", priority: 24 },
  { id: "waffleuniv", match: /와플대학/, brand_name: "와플대학", homepage_url: "https://www.waffleuniv.com", event_url: "https://www.waffleuniv.com", brand_color: "#F5A623", category: "디저트", priority: 25 },
  { id: "isaac", match: /이삭토스트/, brand_name: "이삭토스트", homepage_url: "https://isaac-toast.co.kr", event_url: "https://isaac-toast.co.kr/community/event.php?code=event", brand_color: "#D71920", category: "외식", priority: 34 },
  { id: "goobne", match: /굽네치킨/, brand_name: "굽네치킨", homepage_url: "https://www.goobne.co.kr", event_url: "https://www.goobne.co.kr", brand_color: "#E5322D", category: "외식", priority: 35 },
  { id: "frankburger", match: /프랭크버거/, brand_name: "프랭크버거", homepage_url: "https://frankburger.co.kr", event_url: "https://frankburger.co.kr", brand_color: "#F6B900", category: "외식", priority: 36 },
  { id: "no-more-pizza", match: /노모어피자/, brand_name: "노모어피자", homepage_url: "https://nomorepizza.co.kr", event_url: "https://nomorepizza.co.kr", brand_color: "#E53935", category: "외식", priority: 37 },
  { id: "dukkit", match: /두끼떡볶이/, brand_name: "두끼", homepage_url: "https://www.dookki.co.kr", event_url: "https://www.dookki.co.kr", brand_color: "#E51B23", category: "외식", priority: 38 },
  { id: "ashley", match: /애슐리퀸즈/, brand_name: "애슐리퀸즈", homepage_url: "https://www.myashley.co.kr", event_url: "https://www.myashley.co.kr", brand_color: "#6D1728", category: "외식", priority: 39 },
  { id: "baeksojeong", match: /백소정/, brand_name: "백소정", homepage_url: "https://baeksojeong.com", event_url: "https://baeksojeong.com", brand_color: "#B02A2A", category: "외식", priority: 44 },
  { id: "abiko", match: /아비꼬/, brand_name: "아비꼬", homepage_url: "https://www.abiko.kr", event_url: "https://www.abiko.kr", brand_color: "#D71920", category: "외식", priority: 45 },
  { id: "bonif", match: /본도시락/, brand_name: "본도시락", homepage_url: "https://www.bonif.co.kr", event_url: "https://www.bonif.co.kr", brand_color: "#7A3E22", category: "외식", priority: 46 },
  { id: "davich", match: /다비치안경/, brand_name: "다비치안경", homepage_url: "https://davich.com", event_url: "https://davich.com/whatsnew/davichNews", brand_color: "#0067B1", category: "쇼핑", priority: 52 },
  { id: "olens", match: /오렌즈/, brand_name: "오렌즈", homepage_url: "https://www.o-lens.com", event_url: "https://www.o-lens.com/event", brand_color: "#E6007E", category: "쇼핑", priority: 53 },
  { id: "clean-topia", match: /크린토피아/, brand_name: "크린토피아", homepage_url: "https://www.cleantopia.com", event_url: "https://www.cleantopia.com", brand_color: "#1E73BE", category: "생활", priority: 54 },
];

function normalizedTitle(value = "") {
  return cleanText(value).replace(/(?:-->|\u2192|\u25B6)+/g, " ").replace(/\s+/g, " ").trim();
}

function lowQualityTitle(value = "", brand = "") {
  const title = normalizedTitle(value);
  const withoutBrand = title.replace(new RegExp(`^\\[?${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]?\\s*`, "i"), "").trim();
  return title.length < 7 || title.length > 150 || GENERIC_TITLE.test(withoutBrand)
    || /^(홈|메인|official)(\s*[|\-].*)?$/i.test(withoutBrand)
    || /(바로가기\s*$|404|not found|종료된)/i.test(title);
}

function cleanText(value = "") {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1]?.trim() || null;
}

function absoluteUrl(value, base) {
  if (!value || /^(data:|javascript:|#)/i.test(value)) return null;
  try {
    const parsed = new URL(value, base);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function metaValue(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const label = attr(tag, "property") || attr(tag, "name");
    if (label?.toLowerCase() === key.toLowerCase()) return attr(tag, "content");
  }
  return null;
}

function identifyBenefit(text) {
  if (/1\s*\+\s*1|2\s*\+\s*1/i.test(text)) return "N+1";
  if (/증정|gift/i.test(text)) return "증정";
  if (/쿠폰|coupon/i.test(text)) return "쿠폰";
  if (/무료|free/i.test(text)) return "무료";
  if (/할인|sale|특가/i.test(text)) return "할인";
  if (/신메뉴|신제품|new/i.test(text)) return "NEW";
  return "행사";
}

function extractDates(text) {
  const year = new Date().getFullYear();
  const values = [...text.matchAll(/(?:(20\d{2})[.\/-])?(\d{1,2})[.\/-](\d{1,2})/g)]
    .slice(0, 2)
    .map((m) => new Date(Number(m[1] || year), Number(m[2]) - 1, Number(m[3]), 23, 59, 59));
  return {
    starts_at: values[0] && !Number.isNaN(+values[0]) ? values[0].toISOString() : null,
    ends_at: (values[1] || values[0]) && !Number.isNaN(+(values[1] || values[0])) ? (values[1] || values[0]).toISOString() : null,
  };
}

async function syncRegisteredFranchiseSources() {
  const { data: stores, error: storeError } = await supabase.from("stores").select("name").limit(5000);
  if (storeError) {
    console.warn(`등록 매장 기반 브랜드 출처 확인 생략: ${storeError.message}`);
    return 0;
  }
  const storeNames = (stores || []).map((store) => String(store.name || ""));
  const matched = REGISTERED_FRANCHISE_SOURCES.filter((source) => storeNames.some((name) => source.match.test(name)));
  if (!matched.length) return 0;
  const { data: existing } = await supabase.from("brand_promotion_sources").select("id").in("id", matched.map((source) => source.id));
  const existingIds = new Set((existing || []).map((source) => source.id));
  const missing = matched.filter((source) => !existingIds.has(source.id)).map(({ match: _match, ...source }) => ({
    ...source, active: true, max_items: 16,
  }));
  if (!missing.length) return 0;
  const { error } = await supabase.from("brand_promotion_sources").insert(missing);
  if (error) {
    console.warn(`등록 브랜드 출처 보강 실패: ${error.message}`);
    return 0;
  }
  console.log(`  ✓ 등록 매장 기반 공식 출처 ${missing.length}개 추가`);
  return missing.length;
}

function sameBrandHost(candidate, source) {
  try {
    const a = new URL(candidate).hostname.replace(/^www\./, "");
    const b = new URL(source).hostname.replace(/^www\./, "");
    return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
  } catch {
    return false;
  }
}

async function fetchHtml(url, timeout = 12_000) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; GeumdanPromotionBot/1.0; +https://geumdan-app.vercel.app)",
      "Accept-Language": "ko-KR,ko;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("html")) throw new Error(`unsupported content-type: ${type}`);
  return { html: (await response.text()).slice(0, 2_500_000), finalUrl: response.url };
}

function listCandidates(html, source) {
  const rows = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const href = absoluteUrl(attr(match[1], "href"), source.event_url);
    if (!href || !sameBrandHost(href, source.homepage_url)) continue;
    const imageTag = match[2].match(/<img\b[^>]*>/i)?.[0] || "";
    const image = absoluteUrl(attr(imageTag, "data-src") || attr(imageTag, "src"), href);
    const title = normalizedTitle(attr(imageTag, "alt") || match[2]).slice(0, 140);
    const haystack = `${title} ${href}`;
    const exclude = source.exclude_patterns?.some((word) => haystack.toLowerCase().includes(word.toLowerCase()));
    const eventPath = /\/(event|events|promotion|campaign|benefit)(\/|\?|$)/i.test(href);
    if (exclude || lowQualityTitle(title, source.brand_name) || (!PROMOTION_WORDS.test(title) && !eventPath)) continue;
    rows.push({ source_url: href, title, image_url: image });
  }
  const unique = [...new Map(rows.map((row) => [row.source_url, row])).values()];
  return unique.slice(0, source.max_items || 8);
}

async function enrichCandidate(candidate, source) {
  let html = "";
  let finalUrl = candidate.source_url;
  try {
    const detail = await fetchHtml(candidate.source_url, 8_000);
    html = detail.html;
    finalUrl = detail.finalUrl;
  } catch {
    // 목록에서 확보한 정보라도 저장한다.
  }
  const pageTitle = normalizedTitle(metaValue(html, "og:title") || "").slice(0, 140);
  const candidateTitle = normalizedTitle(candidate.title);
  const pageTitleIsGeneric = !pageTitle
    || lowQualityTitle(pageTitle, source.brand_name)
    || (!PROMOTION_WORDS.test(pageTitle) && PROMOTION_WORDS.test(candidateTitle));
  const title = (pageTitleIsGeneric ? candidateTitle : pageTitle).slice(0, 140);
  const pageDescription = cleanText(metaValue(html, "og:description") || metaValue(html, "description") || "").slice(0, 500);
  const pageText = cleanText(html).slice(0, 12_000);
  // 상세 페이지의 공통 OG 로고보다 이벤트 목록에서 찾은 실제 배너 이미지를 우선합니다.
  const image = absoluteUrl(candidate.image_url || metaValue(html, "og:image"), finalUrl);
  const combined = `${title} ${pageDescription} ${pageText}`;
  if (lowQualityTitle(title, source.brand_name) || /404|not found|종료된/i.test(combined) || (!PROMOTION_WORDS.test(combined) && !/\/(event|promotion|campaign)\//i.test(finalUrl))) return null;
  const dates = extractDates(combined);
  const contentHash = crypto.createHash("sha256").update(`${source.id}|${finalUrl}|${title}|${dates.starts_at || ""}|${dates.ends_at || ""}|${image || ""}`).digest("hex");
  const id = `promo_${crypto.createHash("sha1").update(finalUrl).digest("hex").slice(0, 20)}`;
  return {
    id,
    source_id: source.id,
    brand_name: source.brand_name,
    title,
    summary: null,
    image_url: image,
    source_url: finalUrl,
    benefit_type: identifyBenefit(combined),
    category: source.category || "기타",
    terms_text: null,
    ...dates,
    content_hash: contentHash,
    active: !dates.ends_at || +new Date(dates.ends_at) >= Date.now(),
    fetched_at: new Date().toISOString(),
    raw_metadata: { list_url: source.event_url, official: true },
  };
}

export async function collectBrandPromotions(triggerType = process.env.PROMOTION_TRIGGER || "schedule") {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY가 필요합니다.");
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: { fetch: makeFetch(SUPABASE_SERVICE_KEY) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: run, error: runError } = await supabase
    .from("brand_promotion_runs")
    .insert({ trigger_type: triggerType })
    .select("id")
    .single();
  if (runError) throw runError;

  const errors = [];
  let found = 0;
  let saved = 0;
  await syncRegisteredFranchiseSources();
  const { data: sources, error: sourceError } = await supabase
    .from("brand_promotion_sources")
    .select("*")
    .eq("active", true)
    .order("priority");
  if (sourceError) throw sourceError;

  const { data: existing } = await supabase.from("brand_promotions").select("id,title,brand_name").eq("active", true).limit(500);
  const invalidIds = (existing || [])
    .filter((item) => lowQualityTitle(item.title, item.brand_name) || /404|not found|종단|종료된/i.test(item.title))
    .map((item) => item.id);
  if (invalidIds.length) await supabase.from("brand_promotions").update({ active: false, updated_at: new Date().toISOString() }).in("id", invalidIds);

  for (const source of sources || []) {
    try {
      const { html } = await fetchHtml(source.event_url);
      let candidates = listCandidates(html, source);
      if (!candidates.length) {
        const title = cleanText(metaValue(html, "og:title") || `${source.brand_name} 공식 이벤트`);
        if (PROMOTION_WORDS.test(`${title} ${source.event_url}`)) {
          candidates = [{ source_url: source.event_url, title, image_url: absoluteUrl(metaValue(html, "og:image"), source.event_url) }];
        }
      }
      found += candidates.length;
      const rows = [];
      for (const candidate of candidates) {
        const row = await enrichCandidate(candidate, source);
        if (row) rows.push(row);
      }
      if (rows.length) {
        const { error } = await supabase.from("brand_promotions").upsert(rows, { onConflict: "source_url" });
        if (error) throw error;
        saved += rows.length;
      }
      await supabase.from("brand_promotion_sources").update({
        last_crawled_at: new Date().toISOString(), last_status: "success", last_error: null,
      }).eq("id", source.id);
      console.log(`✅ ${source.brand_name}: ${rows.length}건`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ source: source.id, message: message.slice(0, 180) });
      await supabase.from("brand_promotion_sources").update({
        last_crawled_at: new Date().toISOString(), last_status: "failed", last_error: message.slice(0, 300),
      }).eq("id", source.id);
      console.warn(`⚠️ ${source.brand_name}: ${message}`);
    }
  }

  await supabase.from("brand_promotions")
    .update({ active: false, updated_at: new Date().toISOString() })
    .lt("ends_at", new Date().toISOString());

  await supabase.from("brand_promotion_runs").update({
    finished_at: new Date().toISOString(),
    status: errors.length === (sources || []).length ? "failed" : errors.length ? "partial" : "success",
    sources_checked: (sources || []).length,
    items_found: found,
    items_saved: saved,
    errors,
  }).eq("id", run.id);
  console.log(`\n🎉 브랜드 프로모션 수집 완료: ${saved}건 저장 / ${errors.length}건 오류`);
  return { sourcesChecked: (sources || []).length, itemsFound: found, itemsSaved: saved, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  collectBrandPromotions().catch((error) => {
    console.error("❌ 브랜드 프로모션 수집 실패:", error);
    process.exit(1);
  });
}
