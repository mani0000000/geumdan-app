import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const checked = "2026-08-11T12:30:00Z";
const sql = await readFile("supabase/migrations/20260811213000_seed_golden_square_verified.sql", "utf8");
const block = sql.match(/with verified_stores[\s\S]*?values([\s\S]*?)\n\)\ninsert into public\.stores/)?.[1];
if (!block) throw new Error("골든스퀘어 매장 시드를 읽지 못했습니다.");
const token = "'(?:''|[^'])*'";
const pattern = new RegExp(`\\((${token}),(${token}),(${token}),(${token}),(${token})\\)`, "g");
const decode = (value) => value.slice(1, -1).replaceAll("''", "'");
const stores = [...block.matchAll(pattern)].map((match) => {
  const [id, floor, name, category, emoji] = match.slice(1).map(decode);
  return { id, building_id:"b_golden", name, category, floor_label:floor, emoji, is_published:true,
    description:`${floor} 골든스퀘어 현장 안내판에서 확인된 입점 매장입니다.`, short_description:`${floor} · 골든스퀘어`,
    parking_info:"B1~B3 건물 주차장 이용 가능. 요금과 할인 조건은 방문처에 확인하세요.", source_type:"onsite_directory",
    source_name:"골든스퀘어 현장 층별 안내 (2026-07-01 현재·사용자 제공)", source_checked_at:checked,
    placement_verification:"onsite_directory", floor_verification:"onsite_directory", x:5, y:5, w:90, h:90 };
});
if (stores.length !== 28) throw new Error(`매장 수 검증 실패: ${stores.length}/28`);
const building = { floors:8,ground_floors:8,basement_floors:3,total_stores:28,
  categories:["음식점","카페","부동산","미용","학원","체육","반려동물","생활서비스","종교"],has_data:true,is_published:true,
  building_type:"central_commerce",floor_verification:"admin_verified",source_type:"onsite_directory",
  source_name:"골든스퀘어 현장 층별 안내 (2026-07-01 현재·사용자 제공)",source_checked_at:checked,
  parking_info:"B1 관리사무소 · B1~B3 주차장. 요금과 입점 매장 할인 조건은 현장 확인 필요.",parking_type:"B1~B3 지하주차장",
  parking_base_fee:null,parking_extra_fee:null,parking_daily_max:null,parking_free_minutes:null,
  parking_validation:"주차 요금과 입점 매장 할인 조건은 관리사무소 또는 방문 매장에 확인하세요.",parking_status:"verified",
  parking_verified_at:"2026-08-11",updated_at:new Date().toISOString() };
const floors=[-3,-2,-1,1,2,3,4,5,6,7,8].map(level=>({building_id:"b_golden",level,label:level<0?`B${Math.abs(level)}`:`${level}F`,sort_order:level,
  verification_status:"admin_verified",source_name:"현장 층별 안내판",source_checked_at:checked}));
const ensure=async(operation,label)=>{const {error}=await operation;if(error)throw new Error(`${label}: ${error.message}`);};
await ensure(db.from("buildings").update(building).eq("id","b_golden"),"건물 저장");
await ensure(db.from("stores").delete().eq("building_id","b_golden"),"기존 매장 정리");
await ensure(db.from("floors").delete().eq("building_id","b_golden"),"기존 층 정리");
await ensure(db.from("floors").insert(floors),"층 저장");
await ensure(db.from("stores").insert(stores),"매장 저장");
console.log(JSON.stringify({building:"b_golden",stores:stores.length,floors:floors.length}));
