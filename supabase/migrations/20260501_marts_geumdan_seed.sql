-- ─────────────────────────────────────────────────────────────────
-- 검단신도시 주변 마트 데이터 보강 (2026-05-01)
-- 출처: 카카오/네이버 지도, 마트몬, 점포 공식 페이지 검색 결과
-- 이미 동일한 id가 존재하면 update, 없으면 insert.
-- ─────────────────────────────────────────────────────────────────

INSERT INTO marts
  (id, name, brand, type, address, phone, distance,
   weekday_hours, saturday_hours, sunday_hours,
   closing_pattern, notice, lat, lng, sort_order, active)
VALUES
  -- 대형마트
  ('mart_emart_geumdan', '이마트 검단점', '이마트', '대형마트',
   '인천 서구 서곶로 754', '032-563-1234', NULL,
   '10:00~23:00', '10:00~23:00', '10:00~23:00',
   '2nd4th', '매월 2·4번째 일요일 의무휴업', 37.6045, 126.6618, 10, true),
  ('mart_lotte_geumdan', '롯데마트 검단점', '롯데마트', '대형마트',
   '인천 서구 마전동 951', '032-718-2500', NULL,
   '10:00~23:00', '10:00~23:00', '10:00~23:00',
   '2nd4th', '매월 2·4번째 일요일 의무휴업', 37.6048, 126.6711, 11, true),
  ('mart_homeplus_geomdan', '홈플러스 검단점', '홈플러스', '대형마트',
   '인천 서구 원당대로 760', '032-560-8000', NULL,
   '10:00~24:00', '10:00~24:00', '10:00~24:00',
   '2nd4th', '매월 2·4번째 일요일 의무휴업', 37.6040, 126.6619, 12, true),

  -- 중형마트(SSM)
  ('mart_gs_purugio', 'GS더프레시 검단푸르지오점', 'GS더프레시', '중형마트',
   '인천 서구 원당동 1018 (검단더힐 일대)', '032-562-7033', NULL,
   '10:00~23:00', '10:00~23:00', '10:00~23:00',
   '2nd4th', '매월 2·4번째 일요일 의무휴업', 37.6090, 126.6657, 20, true),
  ('mart_gs_geumdansin', 'GS더프레시 검단신도시점', 'GS더프레시', '중형마트',
   '인천 서구 발산로 6', '032-563-7100', NULL,
   '10:00~23:00', '10:00~23:00', '10:00~23:00',
   '2nd4th', '매월 2·4번째 일요일 의무휴업', 37.6105, 126.6620, 21, true),
  ('mart_nobrand_wondang', '노브랜드 인천원당점', '노브랜드', '중형마트',
   '인천 서구 원당대로 865 (대산프라자 1층)', '02-380-5111', NULL,
   '10:00~22:00', '10:00~22:00', '10:00~22:00',
   '2nd4th', '매월 2·4번째 일요일 의무휴업', 37.6118, 126.6610, 22, true),
  ('mart_emart_everyday_dangha', '이마트 에브리데이 당하점', '이마트 에브리데이', '중형마트',
   '인천 서구 당하동', '032-565-1234', NULL,
   '10:00~23:00', '10:00~23:00', '10:00~23:00',
   '2nd4th', '매월 2·4번째 일요일 의무휴업', 37.6075, 126.6688, 23, true),

  -- 동네마트 / 슈퍼마트
  ('mart_arahome', '아라홈마트', '아라홈마트', '동네마트',
   '인천 서구 아라동(검단신도시)', '0504-2542-1664', NULL,
   '24시간 영업', '24시간 영업', '00:00~23:00',
   'open', '24시간 영업 · 과일/야채/정육 전문', 37.6065, 126.6552, 30, true),
  ('mart_wonmart_majeon', '원마트 마전점', '원마트', '동네마트',
   '인천 서구 마전동', NULL, NULL,
   '24시간 영업', '24시간 영업', '24시간 영업',
   'open', '365일 24시간 영업 · 검단권역 배송', 37.6010, 126.6720, 31, true)
ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  brand            = EXCLUDED.brand,
  type             = EXCLUDED.type,
  address          = EXCLUDED.address,
  phone            = EXCLUDED.phone,
  weekday_hours    = EXCLUDED.weekday_hours,
  saturday_hours   = EXCLUDED.saturday_hours,
  sunday_hours     = EXCLUDED.sunday_hours,
  closing_pattern  = EXCLUDED.closing_pattern,
  notice           = EXCLUDED.notice,
  lat              = EXCLUDED.lat,
  lng              = EXCLUDED.lng,
  sort_order       = EXCLUDED.sort_order,
  active           = EXCLUDED.active;
