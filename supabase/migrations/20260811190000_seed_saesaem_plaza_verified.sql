-- 새샘프라자 현장 층별 안내판 및 주차 이용안내 기반 검증 데이터
-- 확인일: 2026-08-11 / 주소: 인천 서구 이음5로 70

begin;

update public.buildings
set floors = 8,
    ground_floors = 8,
    basement_floors = 2,
    total_stores = 35,
    categories = array['음식점','카페','편의점','미용','학원','반려동물','생활서비스'],
    has_data = true,
    is_published = true,
    building_type = 'central_commerce',
    floor_verification = 'admin_verified',
    source_type = 'onsite_directory',
    source_name = '새샘프라자 현장 층별 안내판·주차 이용안내 (사용자 제공)',
    source_checked_at = '2026-08-11T19:00:00+09:00',
    parking_info = '최초 10분 무료, 이후 10분당 1,000원, 1일 최대 30,000원. 방문처에서 웹 할인 등록 후 출차.',
    parking_type = 'B1~B2 지하주차장 · 카드 결제 전용',
    parking_base_fee = '최초 10분 무료',
    parking_extra_fee = '10분당 1,000원',
    parking_daily_max = '30,000원',
    parking_free_minutes = 10,
    parking_validation = '방문 고객은 방문처에서 웹 할인 등록 후 출차',
    parking_phone = '1899-7275',
    parking_verified_at = '2026-08-11',
    parking_status = 'verified',
    updated_at = now()
where id = 'b_saesaem';

delete from public.stores where building_id = 'b_saesaem';
delete from public.floors where building_id = 'b_saesaem';

insert into public.floors
  (building_id, level, label, sort_order, verification_status, source_name, source_checked_at)
values
  ('b_saesaem', -2, 'B2', -2, 'admin_verified', '현장 주차 이용안내', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', -1, 'B1', -1, 'admin_verified', '현장 주차 이용안내', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 1, '1F', 1, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 2, '2F', 2, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 3, '3F', 3, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 4, '4F', 4, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 5, '5F', 5, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 6, '6F', 6, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 7, '7F', 7, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00'),
  ('b_saesaem', 8, '8F', 8, 'admin_verified', '현장 층별 안내판', '2026-08-11T19:00:00+09:00');

with verified_stores(id, floor_label, name, category, phone, hours, emoji) as (
  values
    ('saesaem_1f_153banchan','1F','일오삼반찬','음식점',null,null,'🥘'),
    ('saesaem_1f_graypeople','1F','그레이핍플 검단점','카페',null,null,'☕'),
    ('saesaem_1f_cu','1F','CU 검단새샘점','편의점',null,null,'🏪'),
    ('saesaem_1f_junsui','1F','준스이','음식점',null,null,'🍱'),
    ('saesaem_1f_insurance','1F','보험케어센터 아라점','생활서비스',null,null,'🛡️'),
    ('saesaem_1f_toystation','1F','토이스테이션','생활서비스',null,null,'🧸'),
    ('saesaem_1f_kubo','1F','쿠보 검단아라점','음식점',null,null,'🍽️'),
    ('saesaem_1f_hasamdong','1F','하삼동커피','카페',null,null,'☕'),
    ('saesaem_1f_railwaybusan','1F','철길부산집 검단신도시점','음식점',null,null,'🍢'),
    ('saesaem_2f_lloydbomb','2F','로이드밤 검단신도시점','미용',null,null,'✂️'),
    ('saesaem_2f_debelle','2F','드벨르 Hair','미용',null,null,'💇'),
    ('saesaem_2f_gcookie','2F','지쿠키','카페',null,null,'🍪'),
    ('saesaem_2f_cartoon','2F','카툰갤러리 검단점','생활서비스',null,null,'📚'),
    ('saesaem_2f_sulbing','2F','설빙 검단신도시점','카페','0507-1481-7826','12:00~22:30 (월요일 휴무)','🍧'),
    ('saesaem_3f_wiseman','3F','와이즈만 영재교육','학원','032-565-0150',null,'🧠'),
    ('saesaem_3f_arabeauty','3F','아라뷰티스튜디오','미용',null,null,'💅'),
    ('saesaem_3f_ovid_high','3F','오비드영어 고등관','학원',null,null,'📖'),
    ('saesaem_3f_bookstore','3F','신검단서점','생활서비스','010-4758-7406',null,'📚'),
    ('saesaem_4f_designpick','4F','디자인픽 미술학원','학원','032-562-8279',null,'🎨'),
    ('saesaem_4f_bulpae_math','4F','불패수학 중고전문','학원',null,null,'➗'),
    ('saesaem_4f_dns','4F','D&S 차별과특별함학원','학원','032-721-4454',null,'📘'),
    ('saesaem_4f_camp_pc','4F','캠프 PC방','생활서비스',null,null,'🎮'),
    ('saesaem_5f_ovid','5F','오비드영어학원','학원','010-8081-8273',null,'📖'),
    ('saesaem_5f_dnj_math','5F','디앤제이 수학학원','학원','010-5857-0610',null,'➗'),
    ('saesaem_5f_science','5F','홍희진 찐과학학원','학원',null,null,'🔬'),
    ('saesaem_5f_rodem','5F','로뎀 음악·미술 학원','학원',null,null,'🎹'),
    ('saesaem_6f_toss','6F','토스어학원 검단신도시 캠퍼스','학원','032-569-4840',null,'🗣️'),
    ('saesaem_6f_top_tkd','6F','경희대 TOP 태권도','체육',null,null,'🥋'),
    ('saesaem_6f_artlab','6F','아트랩 미술학원','학원','032-567-6163',null,'🎨'),
    ('saesaem_7f_church','7F','하늘씨앗교회','종교',null,null,'⛪'),
    ('saesaem_7f_ybm','7F','YBM영어·차이랑중국어','학원',null,null,'🗣️'),
    ('saesaem_7f_leafparrot','7F','앵무새카페 리프패럿','반려동물','070-7760-1019',null,'🦜'),
    ('saesaem_7f_cho_math','7F','조혜숙 수학학원','학원',null,null,'➗'),
    ('saesaem_7f_ctm','7F','씨투엠 사고력 수학·과학','학원',null,null,'🧩'),
    ('saesaem_8f_findog','8F','핀독 애견놀이터','반려동물',null,'09:00~19:00','🐕')
)
insert into public.stores
  (id, building_id, name, category, floor_label, phone, hours, emoji, is_published,
   description, short_description, parking_info, source_type, source_name,
   source_checked_at, placement_verification, floor_verification, x, y, w, h)
select id, 'b_saesaem', name, category, floor_label, phone, hours, emoji, true,
       floor_label || ' 새샘프라자 현장 안내판에서 확인된 입점 매장입니다.',
       floor_label || ' · 새샘프라자',
       '건물 주차장 이용 가능. 방문처에서 웹 할인 등록 후 출차하세요.',
       'onsite_directory', '새샘프라자 현장 층별 안내판 (2026-08-11 사용자 제공)',
       '2026-08-11T19:00:00+09:00', 'onsite_directory', 'onsite_directory',
       5, 5, 90, 90
from verified_stores;

commit;
