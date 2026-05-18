#!/usr/bin/env node
/**
 * update-store-info.mjs
 *
 * stores 테이블의 매장에 전화번호 / 영업시간 / 주소 / 업종별 extra_info 를
 * 실데이터로 채워 넣는 스크립트.
 *
 * 사용법:
 *   1) 현재 DB의 매장 목록만 출력 (조사용):
 *        SUPABASE_SERVICE_KEY=<key> node scripts/batch/update-store-info.mjs --list
 *
 *   2) 아래 STORE_UPDATES 맵을 채운 뒤 실제 반영:
 *        SUPABASE_SERVICE_KEY=<key> node scripts/batch/update-store-info.mjs --apply
 *
 * 동작:
 *   - --list  : stores 테이블 전체를 id / building_id / floor / name / category /
 *               phone / hours 와 함께 출력. 네이버지도·카카오맵·구글에서
 *               매장명을 검색할 때 이 목록을 기준으로 조사한다.
 *   - --apply : STORE_UPDATES 에 정의된 id 만 PATCH. 정의 안 된 매장은 건너뜀.
 *               extra_info 는 기존 값과 머지(병합)되어 기존 키는 보존된다.
 *
 * 주의: phone / hours / address 같은 실세계 정보는 반드시 네이버지도·카카오맵·
 *       구글지도에서 확인한 값만 넣을 것. 추측값을 넣지 말 것.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://plwpfnbhyzblgvliiole.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ??
  "";

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.");
  console.error("   예: SUPABASE_SERVICE_KEY=<key> node scripts/batch/update-store-info.mjs --list");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const mode = process.argv.includes("--apply") ? "apply" : "list";

/**
 * 실데이터 입력 맵.
 * key  = stores.id
 * value = { phone?, hours?, extra_info? }
 *   - phone / hours 는 컬럼 직접 업데이트
 *   - extra_info 는 기존 JSON 과 병합 (address_detail, naver_url, kakao_url,
 *     google_url, instagram, blog_url, delivery_apps, last_order, seats ... )
 *
 * 어드민 매장 수정 폼의 "주소 · 연락 · 링크" / "업종별 상세 정보" 필드 키와 동일.
 * 네이버지도·카카오맵·구글지도에서 "검단 <매장명>" 검색으로 확인한 값만 채운다.
 */
const STORE_UPDATES = {
  // 예시 (구조 참고용 — 실제 조사값으로 교체):
  // "s_3f_1": {
  //   phone: "032-560-4004",
  //   hours: "11:00~21:00",
  //   extra_info: {
  //     address_detail: "인천 서구 ...",
  //     naver_url: "https://naver.me/...",
  //     kakao_url: "https://place.map.kakao.com/...",
  //     menu_highlights: "...",
  //     last_order: "20:30",
  //     seats: "60석",
  //     delivery_apps: "배민, 요기요",
  //   },
  // },
};

async function listStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("id, building_id, floor_label, name, category, phone, hours, extra_info")
    .order("building_id")
    .order("floor_label");
  if (error) {
    console.error("❌ 조회 실패:", error.message);
    process.exit(1);
  }
  console.log(`\n총 ${data.length}개 매장\n`);
  for (const s of data) {
    const filled = s.extra_info && Object.keys(s.extra_info).length > 0 ? "●" : "○";
    console.log(
      `${filled} ${s.id.padEnd(14)} | ${String(s.building_id).padEnd(5)} | ${String(s.floor_label).padEnd(4)} | ` +
        `${s.category.padEnd(7)} | ${s.name}` +
        `${s.phone ? `  ☎ ${s.phone}` : ""}${s.hours ? `  🕒 ${s.hours}` : ""}`
    );
  }
  console.log("\n(● = extra_info 채워짐, ○ = 비어있음)");
  console.log("위 목록의 매장명을 네이버지도/카카오맵/구글에서 검색해 STORE_UPDATES 를 채운 뒤 --apply 실행.");
}

async function applyUpdates() {
  const ids = Object.keys(STORE_UPDATES);
  if (ids.length === 0) {
    console.log("STORE_UPDATES 가 비어 있습니다. 조사한 데이터를 채운 뒤 다시 실행하세요.");
    return;
  }
  // 기존 extra_info 보존을 위해 현재 값 조회
  const { data: current, error: fetchErr } = await supabase
    .from("stores")
    .select("id, extra_info")
    .in("id", ids);
  if (fetchErr) {
    console.error("❌ 기존 데이터 조회 실패:", fetchErr.message);
    process.exit(1);
  }
  const existing = Object.fromEntries(current.map((r) => [r.id, r.extra_info ?? {}]));

  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    const u = STORE_UPDATES[id];
    const patch = {};
    if (u.phone != null) patch.phone = u.phone;
    if (u.hours != null) patch.hours = u.hours;
    if (u.extra_info) patch.extra_info = { ...(existing[id] ?? {}), ...u.extra_info };

    const { error } = await supabase.from("stores").update(patch).eq("id", id);
    if (error) {
      console.error(`  ✗ ${id}: ${error.message}`);
      fail++;
    } else {
      console.log(`  ✓ ${id} 업데이트`);
      ok++;
    }
  }
  console.log(`\n완료: 성공 ${ok} / 실패 ${fail}`);
}

if (mode === "list") {
  await listStores();
} else {
  await applyUpdates();
}
