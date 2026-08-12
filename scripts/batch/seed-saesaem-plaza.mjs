import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const checked = "2026-08-11T10:00:00Z";
const migration = await readFile("supabase/migrations/20260811190000_seed_saesaem_plaza_verified.sql", "utf8");
const valuesBlock = migration.match(/with verified_stores[\s\S]*?values([\s\S]*?)\n\)\ninsert into public\.stores/)?.[1];
if (!valuesBlock) throw new Error("새샘프라자 매장 시드를 읽지 못했습니다.");
const token = "(?:null|'(?:''|[^'])*')";
const rowPattern = new RegExp(`\\((${token}),(${token}),(${token}),(${token}),(${token}),(${token}),(${token})\\)`, "g");
const decode = (value) => value === "null" ? null : value.slice(1, -1).replaceAll("''", "'");
const stores = [...valuesBlock.matchAll(rowPattern)].map((match) => {
  const [id, floor, name, category, phone, hours, emoji] = match.slice(1).map(decode);
  const residentPurpose = category === "학원" ? "대상 학년·상담 시간·등하원 동선"
    : category === "음식점" ? "대표 메뉴·포장·웨이팅"
    : category === "카페" ? "좌석·포장·아이 동반"
    : category === "미용" ? "예약·시술 시간·가격"
    : category === "반려동물" ? "이용 대상·예약·안전 조건"
    : category === "편의점" ? "택배·ATM·24시간 운영"
    : "운영시간·이용 방법";
  const imageUrl = `/api/store-visual?name=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`;
  return {
    id, building_id: "b_saesaem", name, category, floor_label: floor, phone, hours, emoji,
    is_published: true, description: `${floor} 입점 확인 · ${residentPurpose} 중심으로 확인하세요.`,
    short_description: `${floor} · ${residentPurpose}`, thumbnail_url: imageUrl, cover_image_url: imageUrl, landscape_image_url: imageUrl,
    parking_info: "최초 10분 무료. 방문처 웹 할인 등록 후 출차하며 추가 요금은 10분당 1,000원입니다.",
    source_type: "onsite_directory", source_name: "새샘프라자 현장 층별 안내판 (2026-08-11 사용자 제공)",
    source_checked_at: checked, placement_verification: "onsite_directory", floor_verification: "onsite_directory", x: 5, y: 5, w: 90, h: 90,
    extra_info: { local_focus: residentPurpose, image_kind: "category_fallback", image_disclosure: "매장 제공 사진 등록 전 업종 대표 이미지" },
  };
});
if (stores.length !== 35) throw new Error(`매장 수 검증 실패: ${stores.length}/35`);

const building = {
  floors: 8, ground_floors: 8, basement_floors: 2, total_stores: 35,
  categories: ["음식점","카페","편의점","미용","학원","반려동물","생활서비스"], has_data: true, is_published: true,
  building_type: "central_commerce", floor_verification: "admin_verified", source_type: "onsite_directory",
  source_name: "새샘프라자 현장 층별 안내판·주차 이용안내 (사용자 제공)", source_checked_at: checked,
  parking_info: "최초 10분 무료, 이후 10분당 1,000원, 1일 최대 30,000원. 방문처에서 웹 할인 등록 후 출차.",
  parking_type: "B1~B2 지하주차장 · 카드 결제 전용", parking_base_fee: "최초 10분 무료", parking_extra_fee: "10분당 1,000원",
  parking_daily_max: "30,000원", parking_free_minutes: 10, parking_validation: "방문 고객은 방문처에서 웹 할인 등록 후 출차",
  parking_phone: "1899-7275", parking_verified_at: "2026-08-11", parking_status: "verified", updated_at: new Date().toISOString(),
};
const floors = [-2,-1,1,2,3,4,5,6,7,8].map((level) => ({
  building_id: "b_saesaem", level, label: level < 0 ? `B${Math.abs(level)}` : `${level}F`, sort_order: level,
  verification_status: "admin_verified", source_name: level < 0 ? "현장 주차 이용안내" : "현장 층별 안내판", source_checked_at: checked,
}));
const ensure = async (operation, label) => { const { error } = await operation; if (error) throw new Error(`${label}: ${error.message}`); };
await ensure(db.from("buildings").update(building).eq("id", "b_saesaem"), "건물 저장");
await ensure(db.from("stores").delete().eq("building_id", "b_saesaem"), "기존 매장 정리");
await ensure(db.from("floors").delete().eq("building_id", "b_saesaem"), "기존 층 정리");
await ensure(db.from("floors").insert(floors), "층 저장");
await ensure(db.from("stores").insert(stores), "매장 저장");

const { data, error } = await db.from("buildings").select("id,name,floors,ground_floors,basement_floors,total_stores,parking_status").eq("id", "b_saesaem").single();
if (error) throw error;
console.log(JSON.stringify({ building: data, stores: stores.length, floors: floors.length }));
