#!/usr/bin/env node
/**
 * seed-initial-data.mjs
 * One-time script to seed Supabase with initial mock data.
 * Uses SERVICE_KEY for write access.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node scripts/batch/seed-initial-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Seed Data ────────────────────────────────────────────────

const apartments = [
  { id: 'apt1', name: '검단 푸르지오 더 퍼스트', dong: '당하동', households: 1299, built_year: 2022, lat: 37.5448, lng: 126.6863 },
  { id: 'apt2', name: '검단 SK뷰 센트럴',         dong: '불로동', households: 2041, built_year: 2023, lat: 37.5435, lng: 126.6844 },
  { id: 'apt3', name: '검단 한신더휴',             dong: '마전동', households: 978,  built_year: 2021, lat: 37.5470, lng: 126.6901 },
  { id: 'apt4', name: '검단 아이파크 2단지',       dong: '왕길동', households: 1560, built_year: 2022, lat: 37.5500, lng: 126.6940 },
];

const apartmentSizes = [
  { apt_id: 'apt1', pyeong: 24, sqm: 79,  avg_price: 39800 },
  { apt_id: 'apt1', pyeong: 34, sqm: 114, avg_price: 54500 },
  { apt_id: 'apt2', pyeong: 25, sqm: 84,  avg_price: 42000 },
  { apt_id: 'apt3', pyeong: 24, sqm: 79,  avg_price: 36500 },
  { apt_id: 'apt4', pyeong: 34, sqm: 114, avg_price: 52000 },
];

const apartmentPriceHistory = [
  // apt1 - 24평
  { apt_id: 'apt1', pyeong: 24, price: 35000, deal_date: '2024-01', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 36500, deal_date: '2024-04', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 37800, deal_date: '2024-07', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 38200, deal_date: '2024-10', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 38900, deal_date: '2025-01', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 39200, deal_date: '2025-04', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 39500, deal_date: '2025-07', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 39600, deal_date: '2025-10', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 39800, deal_date: '2026-01', floor: 0 },
  { apt_id: 'apt1', pyeong: 24, price: 40100, deal_date: '2026-03', floor: 12 },
  // apt1 - 34평
  { apt_id: 'apt1', pyeong: 34, price: 47000, deal_date: '2024-01', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 49500, deal_date: '2024-04', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 51000, deal_date: '2024-07', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 52000, deal_date: '2024-10', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 53000, deal_date: '2025-01', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 53500, deal_date: '2025-04', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 54000, deal_date: '2025-07', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 54200, deal_date: '2025-10', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 54500, deal_date: '2026-01', floor: 0 },
  { apt_id: 'apt1', pyeong: 34, price: 55200, deal_date: '2026-03', floor: 0 },
  // apt2 - 25평
  { apt_id: 'apt2', pyeong: 25, price: 37000, deal_date: '2024-01', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 38500, deal_date: '2024-04', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 40000, deal_date: '2024-07', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 41000, deal_date: '2024-10', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 41500, deal_date: '2025-01', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 41800, deal_date: '2025-04', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 42000, deal_date: '2025-07', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 42200, deal_date: '2025-10', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 42500, deal_date: '2026-01', floor: 0 },
  { apt_id: 'apt2', pyeong: 25, price: 43000, deal_date: '2026-03', floor: 8 },
  // apt3 - 24평
  { apt_id: 'apt3', pyeong: 24, price: 32000, deal_date: '2024-01', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 33000, deal_date: '2024-04', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 34500, deal_date: '2024-07', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 35000, deal_date: '2024-10', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 35500, deal_date: '2025-01', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 36000, deal_date: '2025-04', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 36200, deal_date: '2025-07', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 36400, deal_date: '2025-10', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 36500, deal_date: '2026-01', floor: 0 },
  { apt_id: 'apt3', pyeong: 24, price: 36800, deal_date: '2026-03', floor: 5 },
  // apt4 - 34평
  { apt_id: 'apt4', pyeong: 34, price: 45000, deal_date: '2024-01', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 47000, deal_date: '2024-04', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 49000, deal_date: '2024-07', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 50000, deal_date: '2024-10', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 50500, deal_date: '2025-01', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 51000, deal_date: '2025-04', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 51500, deal_date: '2025-07', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 51800, deal_date: '2025-10', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 52000, deal_date: '2026-01', floor: 0 },
  { apt_id: 'apt4', pyeong: 34, price: 52500, deal_date: '2026-03', floor: 15 },
];

const pharmacies = [
  {
    id: 'ph1', name: '검단 온누리약국',
    address: '인천 서구 검단로 512', phone: '032-562-1234',
    is_night_pharmacy: true, weekday_hours: '평일 22:00까지',
    weekend_hours: '토 09:00~18:00 / 일 10:00~15:00',
    lat: 37.5448, lng: 126.6850, dong: '검단동',
  },
  {
    id: 'ph2', name: '당하 건강약국',
    address: '인천 서구 당하동 123-4', phone: '032-563-2345',
    is_night_pharmacy: false, weekday_hours: '평일 20:00까지',
    weekend_hours: '토 10:00~17:00',
    lat: 37.5455, lng: 126.6870, dong: '당하동',
  },
  {
    id: 'ph3', name: '검단신도시 24약국',
    address: '인천 서구 마전동 456-7', phone: '032-564-3456',
    is_night_pharmacy: true, weekday_hours: '매일 24시간',
    weekend_hours: '토·일 09:00~21:00',
    lat: 37.5470, lng: 126.6901, dong: '마전동',
  },
  {
    id: 'ph4', name: '불로 해맑은약국',
    address: '인천 서구 불로동 789-1', phone: '032-565-4567',
    is_night_pharmacy: true, weekday_hours: '평일 21:00까지',
    weekend_hours: '토 09:00~19:00 / 일 휴무',
    lat: 37.5435, lng: 126.6844, dong: '불로동',
  },
  {
    id: 'ph5', name: '왕길 드림약국',
    address: '인천 서구 왕길동 321-5', phone: '032-566-5678',
    is_night_pharmacy: false, weekday_hours: '평일 18:30까지',
    weekend_hours: '토·일 10:00~18:00',
    lat: 37.5500, lng: 126.6940, dong: '왕길동',
  },
];

const emergencyRooms = [
  {
    id: 'er1', name: '검단탑병원',
    address: '인천 서구 검단로 345', phone: '032-561-1119',
    level: '지역응급의료기관', is_pediatric: false,
    lat: 37.5450, lng: 126.6860, distance_km: 1.4,
  },
  {
    id: 'er2', name: '인천성모병원',
    address: '인천 부평구 동수로 56', phone: '032-280-5114',
    level: '권역응급의료센터', is_pediatric: true,
    lat: 37.5070, lng: 126.7240, distance_km: 6.2,
  },
  {
    id: 'er3', name: '나사렛국제병원',
    address: '인천 부평구 부평대로 56', phone: '032-570-2114',
    level: '지역응급의료센터', is_pediatric: true,
    lat: 37.5080, lng: 126.7260, distance_km: 7.1,
  },
  {
    id: 'er4', name: '가천대 길병원',
    address: '인천 남동구 남동대로 774', phone: '032-460-3114',
    level: '권역응급의료센터', is_pediatric: true,
    lat: 37.4510, lng: 126.7050, distance_km: 11.3,
  },
  {
    id: 'er5', name: '인하대병원',
    address: '인천 중구 인항로 27', phone: '032-890-2114',
    level: '권역응급의료센터', is_pediatric: true,
    lat: 37.4590, lng: 126.6540, distance_km: 13.8,
  },
];

const buildings = [
  { id: 'b1',  name: '검단 센트럴 타워',     address: '인천 서구 당하로 123',    lat: 37.5448, lng: 126.6863, floors: 5,  total_stores: 18, has_data: true, categories: ['카페','음식점','병원/약국','미용','기타'] },
  { id: 'nb2', name: '당하 스퀘어몰',         address: '인천 서구 당하동 456',    lat: 37.5462, lng: 126.6878, floors: 4,  total_stores: 12, has_data: true, categories: ['카페','음식점','편의점','마트'] },
  { id: 'nb3', name: '검단 플리마켓 타운',    address: '인천 서구 불로동 789',    lat: 37.5435, lng: 126.6844, floors: 2,  total_stores: 24, has_data: true, categories: ['음식점','편의점','카페','기타'] },
  { id: 'nb4', name: '불로대곡 상가단지 A동', address: '인천 서구 대곡동 321',    lat: 37.5421, lng: 126.6831, floors: 3,  total_stores: 9,  has_data: true, categories: ['음식점','병원/약국','마트','기타'] },
  { id: 'nb5', name: '마전 주민센터 상가',    address: '인천 서구 마전로 654',    lat: 37.5470, lng: 126.6901, floors: 2,  total_stores: 6,  has_data: true, categories: ['음식점','편의점','병원/약국'] },
  { id: 'nb6', name: '원당 금곡 상권 A',      address: '인천 서구 금곡대로 100',  lat: 37.5535, lng: 126.6730, floors: 3,  total_stores: 11, has_data: true, categories: ['카페','음식점','미용','학원'] },
  { id: 'nb7', name: '오류왕길 근린상가',     address: '인천 서구 오류동 200',    lat: 37.5500, lng: 126.6940, floors: 2,  total_stores: 8,  has_data: true, categories: ['음식점','마트','편의점','기타'] },
  { id: 'nb8', name: '백석 아라 타운',        address: '인천 서구 백석동 300',    lat: 37.5360, lng: 126.6800, floors: 4,  total_stores: 14, has_data: true, categories: ['카페','음식점','마트','미용','학원'] },
];

// ─── Floor data (all buildings) ──────────────────────────────
const floors = [
  // b1: 검단 센트럴 타워
  { building_id: 'b1', level: -1, label: 'B1', has_restroom: true,  restroom_code: '1234', sort_order: 0 },
  { building_id: 'b1', level:  0, label: '1F', has_restroom: false, restroom_code: null,   sort_order: 1 },
  { building_id: 'b1', level:  1, label: '2F', has_restroom: true,  restroom_code: '5678', sort_order: 2 },
  { building_id: 'b1', level:  2, label: '3F', has_restroom: true,  restroom_code: '9012', sort_order: 3 },
  { building_id: 'b1', level:  3, label: '4F', has_restroom: false, restroom_code: null,   sort_order: 4 },

  // nb2: 당하 스퀘어몰
  { building_id: 'nb2', level:  0, label: '1F', has_restroom: true,  restroom_code: '1111', sort_order: 0 },
  { building_id: 'nb2', level:  1, label: '2F', has_restroom: false, restroom_code: null,   sort_order: 1 },
  { building_id: 'nb2', level:  2, label: '3F', has_restroom: false, restroom_code: null,   sort_order: 2 },
  { building_id: 'nb2', level:  3, label: '4F', has_restroom: true,  restroom_code: '2222', sort_order: 3 },

  // nb3: 검단 플리마켓 타운
  { building_id: 'nb3', level:  0, label: '1F', has_restroom: true,  restroom_code: '0000', sort_order: 0 },
  { building_id: 'nb3', level:  1, label: '2F', has_restroom: true,  restroom_code: '9999', sort_order: 1 },

  // nb4: 불로대곡 상가단지 A동
  { building_id: 'nb4', level:  0, label: '1F', has_restroom: false, restroom_code: null,   sort_order: 0 },
  { building_id: 'nb4', level:  1, label: '2F', has_restroom: true,  restroom_code: '3333', sort_order: 1 },
  { building_id: 'nb4', level:  2, label: '3F', has_restroom: false, restroom_code: null,   sort_order: 2 },

  // nb5: 마전 주민센터 상가
  { building_id: 'nb5', level:  0, label: '1F', has_restroom: true,  restroom_code: null,   sort_order: 0 },
  { building_id: 'nb5', level:  1, label: '2F', has_restroom: false, restroom_code: null,   sort_order: 1 },

  // nb6: 원당 금곡 상권 A
  { building_id: 'nb6', level:  0, label: '1F', has_restroom: false, restroom_code: null,   sort_order: 0 },
  { building_id: 'nb6', level:  1, label: '2F', has_restroom: true,  restroom_code: '4444', sort_order: 1 },
  { building_id: 'nb6', level:  2, label: '3F', has_restroom: false, restroom_code: null,   sort_order: 2 },

  // nb7: 오류왕길 근린상가
  { building_id: 'nb7', level:  0, label: '1F', has_restroom: true,  restroom_code: null,   sort_order: 0 },
  { building_id: 'nb7', level:  1, label: '2F', has_restroom: false, restroom_code: null,   sort_order: 1 },

  // nb8: 백석 아라 타운
  { building_id: 'nb8', level:  0, label: '1F', has_restroom: false, restroom_code: null,   sort_order: 0 },
  { building_id: 'nb8', level:  1, label: '2F', has_restroom: true,  restroom_code: '5555', sort_order: 1 },
  { building_id: 'nb8', level:  2, label: '3F', has_restroom: false, restroom_code: null,   sort_order: 2 },
  { building_id: 'nb8', level:  3, label: '4F', has_restroom: true,  restroom_code: '6666', sort_order: 3 },
];

// Store data for 검단 센트럴 타워 (b1)
const stores = [
  // B1
  { id: 's_b1_1', building_id: 'b1', name: '홈플러스 익스프레스', category: '마트',     floor_label: 'B1', phone: '032-123-4567', hours: '08:00~23:00', is_open: true,  x: 5,  y: 5,  w: 90, h: 50, is_premium: false },
  { id: 's_b1_2', building_id: 'b1', name: '세탁특공대',         category: '기타',     floor_label: 'B1', phone: null,          hours: '09:00~21:00', is_open: true,  x: 5,  y: 62, w: 25, h: 30, is_premium: false },
  { id: 's_b1_3', building_id: 'b1', name: '스타벅스 DT',        category: '카페',     floor_label: 'B1', phone: null,          hours: '07:00~22:00', is_open: true,  x: 35, y: 62, w: 30, h: 30, is_premium: true  },
  { id: 's_b1_4', building_id: 'b1', name: '주차장 입구',        category: '기타',     floor_label: 'B1', phone: null,          hours: null,          is_open: true,  x: 70, y: 62, w: 25, h: 30, is_premium: false },
  // 1F
  { id: 's_1f_1', building_id: 'b1', name: '올리브영',           category: '기타',     floor_label: '1F', phone: '032-234-5678', hours: '10:00~22:00', is_open: true,  x: 5,  y: 5,  w: 40, h: 42, is_premium: true  },
  { id: 's_1f_2', building_id: 'b1', name: '파리바게뜨',         category: '카페',     floor_label: '1F', phone: null,           hours: '08:00~22:00', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 's_1f_3', building_id: 'b1', name: '우리은행',           category: '기타',     floor_label: '1F', phone: null,           hours: '09:00~16:00', is_open: false, x: 5,  y: 54, w: 40, h: 38, is_premium: false },
  { id: 's_1f_4', building_id: 'b1', name: '약국',               category: '병원/약국', floor_label: '1F', phone: null,          hours: '09:00~21:00', is_open: true,  x: 52, y: 54, w: 43, h: 38, is_premium: false },
  // 2F
  { id: 's_2f_1', building_id: 'b1', name: '맘스터치',           category: '음식점',   floor_label: '2F', phone: null,           hours: '10:00~22:00', is_open: true,  x: 5,  y: 5,  w: 40, h: 42, is_premium: false },
  { id: 's_2f_2', building_id: 'b1', name: 'CU 편의점',          category: '편의점',   floor_label: '2F', phone: null,           hours: '24시간',     is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 's_2f_3', building_id: 'b1', name: '이디야커피',         category: '카페',     floor_label: '2F', phone: null,           hours: '08:00~22:00', is_open: true,  x: 5,  y: 54, w: 40, h: 38, is_premium: false },
  { id: 's_2f_4', building_id: 'b1', name: '헬스앤뷰티',         category: '미용',     floor_label: '2F', phone: null,           hours: '10:00~22:00', is_open: true,  x: 52, y: 54, w: 43, h: 38, is_premium: false },
  // 3F
  { id: 's_3f_1', building_id: 'b1', name: '더본코리아',         category: '음식점',   floor_label: '3F', phone: '032-560-4004', hours: '11:00~21:00', is_open: true,  x: 5,  y: 5,  w: 90, h: 45, is_premium: true  },
  { id: 's_3f_2', building_id: 'b1', name: '공실',               category: '기타',     floor_label: '3F', phone: null,           hours: null,          is_open: null,  x: 5,  y: 57, w: 43, h: 38, is_premium: false },
  { id: 's_3f_3', building_id: 'b1', name: '공실',               category: '기타',     floor_label: '3F', phone: null,           hours: null,          is_open: null,  x: 52, y: 57, w: 43, h: 38, is_premium: false },
  // 4F
  { id: 's_4f_1', building_id: 'b1', name: '검단 피트니스',      category: '기타',     floor_label: '4F', phone: null,           hours: '06:00~23:00', is_open: true,  x: 5,  y: 5,  w: 55, h: 90, is_premium: false },
  { id: 's_4f_2', building_id: 'b1', name: '수학학원',           category: '학원',     floor_label: '4F', phone: null,           hours: '14:00~22:00', is_open: true,  x: 65, y: 5,  w: 30, h: 42, is_premium: false },
  { id: 's_4f_3', building_id: 'b1', name: '헤어살롱 모이',      category: '미용',     floor_label: '4F', phone: null,           hours: '10:00~21:00', is_open: true,  x: 65, y: 54, w: 30, h: 41, is_premium: false },

  // ─── nb2: 당하 스퀘어몰 ──────────────────────────────────
  // 1F
  { id: 'nb2_1f_1', building_id: 'nb2', name: 'GS25',           category: '편의점',   floor_label: '1F', phone: null,           hours: '24시간',     is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb2_1f_2', building_id: 'nb2', name: '카페베네',        category: '카페',     floor_label: '1F', phone: null,           hours: '08:00~22:00', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb2_1f_3', building_id: 'nb2', name: '크린토피아',      category: '기타',     floor_label: '1F', phone: null,           hours: '09:00~21:00', is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb2_1f_4', building_id: 'nb2', name: '당하 부동산',     category: '기타',     floor_label: '1F', phone: '032-611-1234', hours: '09:00~18:00', is_open: true,  x: 52, y: 54, w: 43, h: 41, is_premium: false },
  // 2F
  { id: 'nb2_2f_1', building_id: 'nb2', name: '돼지갈비 명가',   category: '음식점',   floor_label: '2F', phone: '032-611-2222', hours: '11:00~22:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb2_2f_2', building_id: 'nb2', name: '닭갈비 순수',     category: '음식점',   floor_label: '2F', phone: null,           hours: '11:30~21:30', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb2_2f_3', building_id: 'nb2', name: '분식나라',         category: '음식점',   floor_label: '2F', phone: null,           hours: '10:00~20:00', is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb2_2f_4', building_id: 'nb2', name: '공실',             category: '기타',     floor_label: '2F', phone: null,           hours: null,          is_open: null,  x: 52, y: 54, w: 43, h: 41, is_premium: false },
  // 3F
  { id: 'nb2_3f_1', building_id: 'nb2', name: '필라테스 스튜디오', category: '기타',   floor_label: '3F', phone: null,           hours: '07:00~22:00', is_open: true,  x: 5,  y: 5,  w: 55, h: 90, is_premium: false },
  { id: 'nb2_3f_2', building_id: 'nb2', name: '독서실 공감',      category: '기타',    floor_label: '3F', phone: null,           hours: '06:00~24:00', is_open: true,  x: 65, y: 5,  w: 30, h: 90, is_premium: false },
  // 4F
  { id: 'nb2_4f_1', building_id: 'nb2', name: '피아노학원',       category: '학원',    floor_label: '4F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 90, is_premium: false },
  { id: 'nb2_4f_2', building_id: 'nb2', name: '태권도장',          category: '기타',   floor_label: '4F', phone: '032-611-4444', hours: '15:00~20:00', is_open: true,  x: 52, y: 5,  w: 43, h: 90, is_premium: false },

  // ─── nb3: 검단 플리마켓 타운 ─────────────────────────────
  // 1F (12 stores)
  { id: 'nb3_1f_01', building_id: 'nb3', name: '반찬가게 푸짐',   category: '음식점',  floor_label: '1F', phone: null,           hours: '08:00~19:00', is_open: true,  x: 5,  y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb3_1f_02', building_id: 'nb3', name: 'CU 편의점',       category: '편의점',  floor_label: '1F', phone: null,           hours: '24시간',     is_open: true,  x: 37, y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb3_1f_03', building_id: 'nb3', name: '국밥 한마당',      category: '음식점', floor_label: '1F', phone: null,           hours: '07:00~21:00', is_open: true,  x: 69, y: 5,  w: 26, h: 42, is_premium: false },
  { id: 'nb3_1f_04', building_id: 'nb3', name: '분식 터미널',      category: '음식점', floor_label: '1F', phone: null,           hours: '09:00~20:00', is_open: true,  x: 5,  y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_1f_05', building_id: 'nb3', name: '치킨 더 본',       category: '음식점', floor_label: '1F', phone: null,           hours: '11:00~23:00', is_open: true,  x: 37, y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_1f_06', building_id: 'nb3', name: '중화요리 금룡',    category: '음식점', floor_label: '1F', phone: '032-622-1234', hours: '11:00~21:00', is_open: true,  x: 69, y: 54, w: 26, h: 41, is_premium: false },
  { id: 'nb3_1f_07', building_id: 'nb3', name: '스시 오마카세',    category: '음식점', floor_label: '1F', phone: '032-622-2345', hours: '11:30~22:00', is_open: true,  x: 5,  y: 5,  w: 28, h: 42, is_premium: true  },
  { id: 'nb3_1f_08', building_id: 'nb3', name: '족발 보쌈 한가득', category: '음식점', floor_label: '1F', phone: null,           hours: '12:00~22:00', is_open: true,  x: 37, y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb3_1f_09', building_id: 'nb3', name: '갈비탕 정식',      category: '음식점', floor_label: '1F', phone: null,           hours: '10:00~21:00', is_open: true,  x: 69, y: 5,  w: 26, h: 42, is_premium: false },
  { id: 'nb3_1f_10', building_id: 'nb3', name: '순대국 본가',      category: '음식점', floor_label: '1F', phone: null,           hours: '07:00~20:00', is_open: true,  x: 5,  y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_1f_11', building_id: 'nb3', name: '커피플레이스',     category: '카페',   floor_label: '1F', phone: null,           hours: '08:00~21:00', is_open: true,  x: 37, y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_1f_12', building_id: 'nb3', name: '뚜레쥬르',         category: '카페',   floor_label: '1F', phone: null,           hours: '08:00~22:00', is_open: true,  x: 69, y: 54, w: 26, h: 41, is_premium: false },
  // 2F (12 stores)
  { id: 'nb3_2f_01', building_id: 'nb3', name: '놀이방 카페',      category: '카페',   floor_label: '2F', phone: '032-622-3456', hours: '10:00~20:00', is_open: true,  x: 5,  y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb3_2f_02', building_id: 'nb3', name: '영어학원 Kids',   category: '학원',   floor_label: '2F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 37, y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb3_2f_03', building_id: 'nb3', name: '수학학원 상상',    category: '학원',   floor_label: '2F', phone: null,           hours: '14:00~22:00', is_open: true,  x: 69, y: 5,  w: 26, h: 42, is_premium: false },
  { id: 'nb3_2f_04', building_id: 'nb3', name: '네일샵',            category: '미용',  floor_label: '2F', phone: null,           hours: '10:00~21:00', is_open: true,  x: 5,  y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_2f_05', building_id: 'nb3', name: '피부관리실',        category: '미용',  floor_label: '2F', phone: null,           hours: '10:00~20:00', is_open: true,  x: 37, y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_2f_06', building_id: 'nb3', name: '공실',              category: '기타',  floor_label: '2F', phone: null,           hours: null,          is_open: null,  x: 69, y: 54, w: 26, h: 41, is_premium: false },
  { id: 'nb3_2f_07', building_id: 'nb3', name: '공실',              category: '기타',  floor_label: '2F', phone: null,           hours: null,          is_open: null,  x: 5,  y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb3_2f_08', building_id: 'nb3', name: '공실',              category: '기타',  floor_label: '2F', phone: null,           hours: null,          is_open: null,  x: 37, y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb3_2f_09', building_id: 'nb3', name: '사무실 A',          category: '기타',  floor_label: '2F', phone: null,           hours: '09:00~18:00', is_open: true,  x: 69, y: 5,  w: 26, h: 42, is_premium: false },
  { id: 'nb3_2f_10', building_id: 'nb3', name: '사무실 B',          category: '기타',  floor_label: '2F', phone: null,           hours: '09:00~18:00', is_open: true,  x: 5,  y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_2f_11', building_id: 'nb3', name: '공실',              category: '기타',  floor_label: '2F', phone: null,           hours: null,          is_open: null,  x: 37, y: 54, w: 28, h: 41, is_premium: false },
  { id: 'nb3_2f_12', building_id: 'nb3', name: '공실',              category: '기타',  floor_label: '2F', phone: null,           hours: null,          is_open: null,  x: 69, y: 54, w: 26, h: 41, is_premium: false },

  // ─── nb4: 불로대곡 상가단지 A동 ─────────────────────────
  // 1F
  { id: 'nb4_1f_1', building_id: 'nb4', name: '불로 마트',         category: '마트',    floor_label: '1F', phone: '032-633-1111', hours: '08:00~22:00', is_open: true,  x: 5,  y: 5,  w: 55, h: 90, is_premium: false },
  { id: 'nb4_1f_2', building_id: 'nb4', name: '대곡 부동산',        category: '기타',   floor_label: '1F', phone: '032-633-2222', hours: '09:00~18:00', is_open: true,  x: 65, y: 5,  w: 30, h: 90, is_premium: false },
  // 2F
  { id: 'nb4_2f_1', building_id: 'nb4', name: '내과의원',           category: '병원/약국', floor_label: '2F', phone: '032-633-3333', hours: '09:00~18:00', is_open: true,  x: 5,  y: 5,  w: 28, h: 90, is_premium: false },
  { id: 'nb4_2f_2', building_id: 'nb4', name: '치과의원',           category: '병원/약국', floor_label: '2F', phone: '032-633-4444', hours: '09:00~19:00', is_open: true,  x: 37, y: 5,  w: 28, h: 90, is_premium: false },
  { id: 'nb4_2f_3', building_id: 'nb4', name: '정형외과',           category: '병원/약국', floor_label: '2F', phone: '032-633-5555', hours: '09:00~18:00', is_open: false, x: 69, y: 5,  w: 26, h: 90, is_premium: false },
  // 3F
  { id: 'nb4_3f_1', building_id: 'nb4', name: '보습학원 한빛',      category: '학원',   floor_label: '3F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 90, is_premium: false },
  { id: 'nb4_3f_2', building_id: 'nb4', name: '보습학원 신화',      category: '학원',   floor_label: '3F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 52, y: 5,  w: 21, h: 90, is_premium: false },
  { id: 'nb4_3f_3', building_id: 'nb4', name: '태권도장',            category: '기타',  floor_label: '3F', phone: null,           hours: '14:00~20:00', is_open: true,  x: 76, y: 5,  w: 19, h: 90, is_premium: false },
  { id: 'nb4_3f_4', building_id: 'nb4', name: '피아노학원',          category: '학원',  floor_label: '3F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 52, y: 5,  w: 43, h: 90, is_premium: false },

  // ─── nb5: 마전 주민센터 상가 ─────────────────────────────
  // 1F
  { id: 'nb5_1f_1', building_id: 'nb5', name: '세븐일레븐',         category: '편의점', floor_label: '1F', phone: null,           hours: '24시간',     is_open: true,  x: 5,  y: 5,  w: 28, h: 90, is_premium: false },
  { id: 'nb5_1f_2', building_id: 'nb5', name: '마전 카페',          category: '카페',   floor_label: '1F', phone: null,           hours: '08:00~21:00', is_open: true,  x: 37, y: 5,  w: 28, h: 90, is_premium: false },
  { id: 'nb5_1f_3', building_id: 'nb5', name: '마전 부동산',         category: '기타',  floor_label: '1F', phone: '032-644-1111', hours: '09:00~18:00', is_open: true,  x: 69, y: 5,  w: 26, h: 90, is_premium: false },
  // 2F
  { id: 'nb5_2f_1', building_id: 'nb5', name: '가정의학과',          category: '병원/약국', floor_label: '2F', phone: '032-644-2222', hours: '09:00~18:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 90, is_premium: false },
  { id: 'nb5_2f_2', building_id: 'nb5', name: '약국',                category: '병원/약국', floor_label: '2F', phone: null,           hours: '09:00~21:00', is_open: true,  x: 52, y: 5,  w: 22, h: 90, is_premium: false },
  { id: 'nb5_2f_3', building_id: 'nb5', name: '공실',                category: '기타',  floor_label: '2F', phone: null,           hours: null,          is_open: null,  x: 78, y: 5,  w: 17, h: 90, is_premium: false },

  // ─── nb6: 원당 금곡 상권 A ───────────────────────────────
  // 1F
  { id: 'nb6_1f_1', building_id: 'nb6', name: '미니스톱',            category: '편의점', floor_label: '1F', phone: null,           hours: '24시간',     is_open: true,  x: 5,  y: 5,  w: 28, h: 42, is_premium: false },
  { id: 'nb6_1f_2', building_id: 'nb6', name: '블루보틀 카페',       category: '카페',   floor_label: '1F', phone: null,           hours: '08:00~22:00', is_open: true,  x: 37, y: 5,  w: 28, h: 42, is_premium: true  },
  { id: 'nb6_1f_3', building_id: 'nb6', name: '금곡 미용실',         category: '미용',   floor_label: '1F', phone: null,           hours: '10:00~20:00', is_open: true,  x: 69, y: 5,  w: 26, h: 42, is_premium: false },
  { id: 'nb6_1f_4', building_id: 'nb6', name: '원당 부동산',          category: '기타',  floor_label: '1F', phone: '032-655-1111', hours: '09:00~18:00', is_open: true,  x: 5,  y: 54, w: 90, h: 41, is_premium: false },
  // 2F
  { id: 'nb6_2f_1', building_id: 'nb6', name: '금곡 한식당',          category: '음식점', floor_label: '2F', phone: '032-655-2222', hours: '10:00~21:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb6_2f_2', building_id: 'nb6', name: '중식당 화룡',          category: '음식점', floor_label: '2F', phone: null,           hours: '11:00~21:00', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb6_2f_3', building_id: 'nb6', name: '원당 분식',            category: '음식점', floor_label: '2F', phone: null,           hours: '09:00~20:00', is_open: true,  x: 5,  y: 54, w: 90, h: 41, is_premium: false },
  // 3F
  { id: 'nb6_3f_1', building_id: 'nb6', name: '열람실 24',            category: '기타',  floor_label: '3F', phone: null,           hours: '06:00~24:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb6_3f_2', building_id: 'nb6', name: '영어학원',             category: '학원',  floor_label: '3F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb6_3f_3', building_id: 'nb6', name: '피아노학원',           category: '학원',  floor_label: '3F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb6_3f_4', building_id: 'nb6', name: '요가 스튜디오',        category: '기타',  floor_label: '3F', phone: null,           hours: '07:00~21:00', is_open: true,  x: 52, y: 54, w: 43, h: 41, is_premium: false },

  // ─── nb7: 오류왕길 근린상가 ─────────────────────────────
  // 1F
  { id: 'nb7_1f_1', building_id: 'nb7', name: '오류 마트',            category: '마트',  floor_label: '1F', phone: '032-666-1111', hours: '08:00~22:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb7_1f_2', building_id: 'nb7', name: 'GS25 오류점',          category: '편의점', floor_label: '1F', phone: null,           hours: '24시간',     is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb7_1f_3', building_id: 'nb7', name: '왕길 카페',             category: '카페',  floor_label: '1F', phone: null,           hours: '08:00~21:00', is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb7_1f_4', building_id: 'nb7', name: '크린존 세탁',           category: '기타',  floor_label: '1F', phone: null,           hours: '09:00~21:00', is_open: true,  x: 52, y: 54, w: 43, h: 41, is_premium: false },
  // 2F
  { id: 'nb7_2f_1', building_id: 'nb7', name: '오류 피자',             category: '음식점', floor_label: '2F', phone: null,           hours: '11:00~22:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb7_2f_2', building_id: 'nb7', name: '왕길 치킨',             category: '음식점', floor_label: '2F', phone: null,           hours: '14:00~23:00', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb7_2f_3', building_id: 'nb7', name: '족발집',                category: '음식점', floor_label: '2F', phone: null,           hours: '12:00~22:00', is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb7_2f_4', building_id: 'nb7', name: '분식 천국',             category: '음식점', floor_label: '2F', phone: null,           hours: '09:00~20:00', is_open: true,  x: 52, y: 54, w: 43, h: 41, is_premium: false },

  // ─── nb8: 백석 아라 타운 ────────────────────────────────
  // 1F
  { id: 'nb8_1f_1', building_id: 'nb8', name: '올리브영',             category: '기타',  floor_label: '1F', phone: '032-677-1111', hours: '10:00~22:00', is_open: true,  x: 5,  y: 5,  w: 40, h: 42, is_premium: true  },
  { id: 'nb8_1f_2', building_id: 'nb8', name: '파리바게뜨',           category: '카페',  floor_label: '1F', phone: null,           hours: '08:00~22:00', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb8_1f_3', building_id: 'nb8', name: 'GS25 백석점',          category: '편의점', floor_label: '1F', phone: null,           hours: '24시간',     is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb8_1f_4', building_id: 'nb8', name: '백석 부동산',          category: '기타',  floor_label: '1F', phone: '032-677-2222', hours: '09:00~18:00', is_open: true,  x: 52, y: 54, w: 43, h: 41, is_premium: false },
  // 2F
  { id: 'nb8_2f_1', building_id: 'nb8', name: '제주 흑돼지',           category: '음식점', floor_label: '2F', phone: '032-677-3333', hours: '11:30~22:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: true  },
  { id: 'nb8_2f_2', building_id: 'nb8', name: '일본식 라멘',           category: '음식점', floor_label: '2F', phone: null,           hours: '11:00~21:30', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb8_2f_3', building_id: 'nb8', name: '이탈리아 파스타',       category: '음식점', floor_label: '2F', phone: null,           hours: '11:00~22:00', is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb8_2f_4', building_id: 'nb8', name: '중화반점',              category: '음식점', floor_label: '2F', phone: null,           hours: '11:00~21:00', is_open: true,  x: 52, y: 54, w: 43, h: 41, is_premium: false },
  // 3F
  { id: 'nb8_3f_1', building_id: 'nb8', name: '독서실 집중',           category: '기타',  floor_label: '3F', phone: null,           hours: '06:00~24:00', is_open: true,  x: 5,  y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb8_3f_2', building_id: 'nb8', name: '영어학원 스마트',       category: '학원',  floor_label: '3F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 52, y: 5,  w: 43, h: 42, is_premium: false },
  { id: 'nb8_3f_3', building_id: 'nb8', name: '수학학원 에이플',       category: '학원',  floor_label: '3F', phone: null,           hours: '14:00~22:00', is_open: true,  x: 5,  y: 54, w: 43, h: 41, is_premium: false },
  { id: 'nb8_3f_4', building_id: 'nb8', name: '피아노학원',             category: '학원', floor_label: '3F', phone: null,           hours: '13:00~21:00', is_open: true,  x: 52, y: 54, w: 43, h: 41, is_premium: false },
  // 4F
  { id: 'nb8_4f_1', building_id: 'nb8', name: '백석 헬스장',           category: '기타',  floor_label: '4F', phone: null,           hours: '06:00~23:00', is_open: true,  x: 5,  y: 5,  w: 55, h: 90, is_premium: false },
  { id: 'nb8_4f_2', building_id: 'nb8', name: '필라테스 아라',         category: '기타',  floor_label: '4F', phone: null,           hours: '07:00~22:00', is_open: true,  x: 65, y: 5,  w: 30, h: 90, is_premium: false },
];

// ─── Helpers ─────────────────────────────────────────────────

async function upsert(table, rows, conflictColumn = 'id') {
  if (rows.length === 0) return;
  console.log(`  Upserting ${rows.length} rows into ${table}...`);
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: conflictColumn });
  if (error) {
    console.error(`  ❌ Error upserting ${table}:`, error.message);
    throw error;
  }
  console.log(`  ✅ ${table} done`);
}

// ─── Main ────────────────────────────────────────────────────

console.log('🌱 Starting initial data seed...\n');

try {
  console.log('📦 Seeding apartments...');
  await upsert('apartments', apartments);
  await upsert('apartment_sizes', apartmentSizes, 'apt_id');
  // Price history doesn't have a unique business key — use apt_id+pyeong+deal_date combo
  // We'll delete existing and re-insert to avoid duplicates
  console.log('  Clearing existing price history...');
  const { error: delError } = await supabase
    .from('apartment_price_history')
    .delete()
    .in('apt_id', apartments.map(a => a.id));
  if (delError) console.warn('  ⚠️  Could not clear price history:', delError.message);
  const { error: insertError } = await supabase
    .from('apartment_price_history')
    .insert(apartmentPriceHistory);
  if (insertError) {
    console.error('  ❌ Error inserting price history:', insertError.message);
  } else {
    console.log(`  ✅ apartment_price_history done (${apartmentPriceHistory.length} rows)`);
  }

  console.log('\n🏥 Seeding pharmacies...');
  await upsert('pharmacies', pharmacies);

  console.log('\n🚑 Seeding emergency rooms...');
  await upsert('emergency_rooms', emergencyRooms);

  console.log('\n🏢 Seeding buildings...');
  await upsert('buildings', buildings);

  console.log('\n🏬 Seeding floors...');
  // floors use (building_id, label) as unique constraint
  for (const floor of floors) {
    const { error } = await supabase
      .from('floors')
      .upsert(floor, { onConflict: 'building_id,label' });
    if (error) {
      console.error(`  ❌ Error upserting floor ${floor.building_id}/${floor.label}:`, error.message);
    }
  }
  console.log(`  ✅ floors done (${floors.length} rows)`);

  console.log('\n🏪 Seeding stores...');
  await upsert('stores', stores);

  console.log('\n✅ Seed complete!');
} catch (err) {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
}
