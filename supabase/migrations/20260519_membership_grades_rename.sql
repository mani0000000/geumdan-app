-- 멤버십 등급명 검단 동네 감성으로 변경 (기존 시드 DB 갱신용, sort_order 기준 idempotent)
UPDATE membership_grades SET name = '검단 새내기', benefits = '기본 혜택 · 쿠폰 교환 이용 가능'              WHERE sort_order = 0;
UPDATE membership_grades SET name = '검단 단골',   benefits = '교환 쿠폰 5% 추가 적립 · 단골 전용 쿠폰 열람'  WHERE sort_order = 1;
UPDATE membership_grades SET name = '검단 일꾼',   benefits = '교환 쿠폰 10% 추가 적립 · 일꾼 한정 쿠폰'      WHERE sort_order = 2;
UPDATE membership_grades SET name = '검단 지킴이', benefits = '교환 쿠폰 우선권 · 지킴이 전용 프리미엄 쿠폰'  WHERE sort_order = 3;
