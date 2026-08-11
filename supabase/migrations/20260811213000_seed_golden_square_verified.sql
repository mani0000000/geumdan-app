-- 골든스퀘어 현장 층별 안내판 기반 검증 데이터
-- 안내판 기준일: 2026-07-01 / 확인일: 2026-08-11

begin;

update public.buildings
set floors = 8,
    ground_floors = 8,
    basement_floors = 3,
    total_stores = 28,
    categories = array['음식점','카페','부동산','미용','학원','체육','반려동물','생활서비스','종교'],
    has_data = true,
    is_published = true,
    building_type = 'central_commerce',
    floor_verification = 'admin_verified',
    source_type = 'onsite_directory',
    source_name = '골든스퀘어 현장 층별 안내 (2026-07-01 현재·사용자 제공)',
    source_checked_at = '2026-08-11T21:30:00+09:00',
    parking_info = 'B1 관리사무소 · B1~B3 주차장. 요금과 입점 매장 할인 조건은 현장 확인 필요.',
    parking_type = 'B1~B3 지하주차장',
    parking_base_fee = null,
    parking_extra_fee = null,
    parking_daily_max = null,
    parking_free_minutes = null,
    parking_validation = '주차 요금과 입점 매장 할인 조건은 관리사무소 또는 방문 매장에 확인하세요.',
    parking_status = 'verified',
    parking_verified_at = '2026-08-11',
    updated_at = now()
where id = 'b_golden';

delete from public.stores where building_id = 'b_golden';
delete from public.floors where building_id = 'b_golden';

insert into public.floors
  (building_id, level, label, sort_order, verification_status, source_name, source_checked_at)
values
  ('b_golden', -3, 'B3', -3, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', -2, 'B2', -2, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', -1, 'B1', -1, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 1, '1F', 1, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 2, '2F', 2, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 3, '3F', 3, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 4, '4F', 4, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 5, '5F', 5, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 6, '6F', 6, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 7, '7F', 7, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00'),
  ('b_golden', 8, '8F', 8, 'admin_verified', '현장 층별 안내판', '2026-08-11T21:30:00+09:00');

with verified_stores(id, floor_label, name, category, emoji) as (
  values
    ('golden_1f_kimsuksung','1F','김숙성','음식점','🥩'),
    ('golden_1f_top_realty','1F','검단탑부동산','부동산','🏠'),
    ('golden_1f_cafe_graphy','1F','카페그래피','카페','☕'),
    ('golden_1f_cheongsilhongsil','1F','청실홍실','음식점','🥟'),
    ('golden_1f_photoive','1F','Photo-ive','생활서비스','📷'),
    ('golden_1f_pixpot','1F','pixpot','생활서비스','📸'),
    ('golden_1f_enter_arcade','1F','Enter오락실','생활서비스','🕹️'),
    ('golden_1f_nextiel_realty','1F','넥스티엘부동산','부동산','🏠'),
    ('golden_1f_jinsim_realty','1F','검단진심부동산','부동산','🏠'),
    ('golden_1f_100_realty','1F','검단100억부동산','부동산','🏠'),
    ('golden_2f_sokyang','2F','속양화로','음식점','🔥'),
    ('golden_3f_chamimat','3F','참이맛감자탕','음식점','🍲'),
    ('golden_3f_hwanghu','3F','황후아로마','미용','🌿'),
    ('golden_3f_today_pretty','3F','오늘도예쁨헤어','미용','💇'),
    ('golden_3f_tax','3F','조덕연세무사','생활서비스','🧾'),
    ('golden_3f_mouamong','3F','무아몽헤어','미용','✂️'),
    ('golden_3f_ssong_beauty','3F','쏭앤뷰티','미용','💅'),
    ('golden_4f_avalon','4F','아발론비원교육 검단신도시점','학원','📘'),
    ('golden_4f_pilates','4F','바른필라테스','체육','🧘'),
    ('golden_4f_rookies','4F','루키즈 축구클럽','체육','⚽'),
    ('golden_4f_milmaro','4F','밀마로헤어','미용','💇'),
    ('golden_4f_barriera','4F','바리에라','미용','💅'),
    ('golden_6f_redforce','6F','레드포스 PC 아레나','생활서비스','🎮'),
    ('golden_6f_dog_school','6F','나무야일로와','반려동물','🐕'),
    ('golden_6f_church','6F','순복음이음교회','종교','⛪'),
    ('golden_6f_qhair','6F','큐사랑 & 미용실','미용','✂️'),
    ('golden_7f_araxgym','7F','아라엑스짐','체육','🏋️'),
    ('golden_8f_rookies','8F','루키즈 축구클럽','체육','⚽')
)
insert into public.stores
  (id, building_id, name, category, floor_label, emoji, is_published, description,
   short_description, parking_info, source_type, source_name, source_checked_at,
   placement_verification, floor_verification, x, y, w, h)
select id, 'b_golden', name, category, floor_label, emoji, true,
       floor_label || ' 골든스퀘어 현장 안내판에서 확인된 입점 매장입니다.',
       floor_label || ' · 골든스퀘어',
       'B1~B3 건물 주차장 이용 가능. 요금과 할인 조건은 방문처에 확인하세요.',
       'onsite_directory', '골든스퀘어 현장 층별 안내 (2026-07-01 현재·사용자 제공)',
       '2026-08-11T21:30:00+09:00', 'onsite_directory', 'onsite_directory', 5, 5, 90, 90
from verified_stores;

commit;
