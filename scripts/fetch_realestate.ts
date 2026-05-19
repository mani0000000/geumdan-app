#!/usr/bin/env -S npx tsx
/**
 * 검단신도시 부동산 배치 — CLI
 *
 * 국토교통부 실거래가/전월세 OPEN API → Supabase apartment_trades / apartment_rentals
 *
 * 환경변수 (필수):
 *   MOLIT_API_KEY        공공데이터포털(data.go.kr) 인증키
 *   SUPABASE_URL         Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_KEY Supabase service_role 키
 *
 * 환경변수 (호환):
 *   DATA_GO_KR_API_KEY   MOLIT_API_KEY 대체로 사용 가능
 *
 * 사용법:
 *   npx tsx scripts/fetch_realestate.ts                  # 전월 1개월
 *   npx tsx scripts/fetch_realestate.ts --months=6       # 최근 6개월
 *   npx tsx scripts/fetch_realestate.ts --ym=202604      # 특정월 단건 (반복 가능)
 *   npx tsx scripts/fetch_realestate.ts --ym=202604,202603
 */

import { runRealestateBatch } from "../lib/realestate-batch";

const apiKey =
  process.env.MOLIT_API_KEY ||
  process.env.DATA_GO_KR_API_KEY ||
  "";
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!apiKey || !supabaseUrl || !supabaseKey) {
  console.error("❌  필수 환경변수 누락:");
  if (!apiKey)      console.error("    - MOLIT_API_KEY (또는 DATA_GO_KR_API_KEY)");
  if (!supabaseUrl) console.error("    - SUPABASE_URL");
  if (!supabaseKey) console.error("    - SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const monthsArg = args.find(a => a.startsWith("--months="));
const ymArg     = args.find(a => a.startsWith("--ym="));
const months    = monthsArg ? parseInt(monthsArg.split("=")[1], 10) || 1 : 1;
const yearMonths = ymArg
  ? ymArg.split("=")[1].split(",").map(s => s.trim()).filter(Boolean)
  : undefined;

console.log("🏘️  검단신도시 부동산 배치 시작");
console.log(`    대상: ${yearMonths ? yearMonths.join(", ") : `최근 ${months}개월`}`);

(async () => {
  try {
    const result = await runRealestateBatch({
      apiKey,
      supabaseUrl,
      supabaseKey,
      months,
      yearMonths,
      triggerSource: "cli",
    });

    console.log("\n📊 결과");
    console.log(`    상태       : ${result.status}`);
    console.log(`    매매 수집  : ${result.tradesCount}건`);
    console.log(`    전월세     : ${result.rentalsCount}건`);
    console.log(`    로그 ID    : ${result.logId ?? "(없음)"}`);
    console.log("\n월별 상세:");
    for (const d of result.details) {
      const err = d.error ? ` ❌ ${d.error}` : "";
      console.log(`    ${d.yearMonth}: 매매 ${d.tradesAll}→${d.tradesKept}건, 전월세 ${d.rentalsAll}→${d.rentalsKept}건${err}`);
    }

    process.exit(result.status === "failed" ? 1 : 0);
  } catch (err) {
    console.error("\n❌  실패:", err);
    process.exit(1);
  }
})();
