create table if not exists public.brand_promotion_sources (
  id                 text primary key,
  brand_name         text not null,
  homepage_url       text not null,
  event_url          text not null,
  logo_url           text,
  brand_color        text not null default '#2563eb',
  category           text not null default '기타',
  include_patterns   text[] not null default array['event','promotion','benefit','news','notice']::text[],
  exclude_patterns   text[] not null default array['login','join','privacy','recruit']::text[],
  max_items          smallint not null default 8 check (max_items between 1 and 30),
  priority           smallint not null default 50,
  active             boolean not null default true,
  last_crawled_at    timestamptz,
  last_status        text,
  last_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.brand_promotions (
  id                 text primary key,
  source_id          text not null references public.brand_promotion_sources(id) on delete cascade,
  brand_name         text not null,
  title              text not null,
  summary            text,
  image_url          text,
  source_url         text not null unique,
  benefit_type       text not null default '행사',
  category           text not null default '기타',
  terms_text         text,
  starts_at          timestamptz,
  ends_at            timestamptz,
  content_hash       text not null,
  featured           boolean not null default false,
  active             boolean not null default true,
  sort_order         integer not null default 0,
  fetched_at         timestamptz not null default now(),
  first_seen_at      timestamptz not null default now(),
  raw_metadata       jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.brand_promotion_runs (
  id                 bigint generated always as identity primary key,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  status             text not null default 'running',
  sources_checked    integer not null default 0,
  items_found        integer not null default 0,
  items_saved        integer not null default 0,
  errors             jsonb not null default '[]'::jsonb,
  trigger_type       text not null default 'schedule'
);

create index if not exists brand_promotions_visible_idx
  on public.brand_promotions (active, featured desc, sort_order, fetched_at desc);
create index if not exists brand_promotions_source_idx
  on public.brand_promotions (source_id, fetched_at desc);
create index if not exists brand_promotion_runs_started_idx
  on public.brand_promotion_runs (started_at desc);

alter table public.brand_promotion_sources enable row level security;
alter table public.brand_promotions enable row level security;
alter table public.brand_promotion_runs enable row level security;

drop policy if exists brand_promotion_sources_public_read on public.brand_promotion_sources;
create policy brand_promotion_sources_public_read on public.brand_promotion_sources
  for select to anon, authenticated using (active = true);
drop policy if exists brand_promotions_public_read on public.brand_promotions;
create policy brand_promotions_public_read on public.brand_promotions
  for select to anon, authenticated using (active = true);

grant select on public.brand_promotion_sources, public.brand_promotions to anon, authenticated;
grant all on public.brand_promotion_sources, public.brand_promotions, public.brand_promotion_runs to service_role;
grant usage, select on sequence public.brand_promotion_runs_id_seq to service_role;

insert into public.brand_promotion_sources
  (id, brand_name, homepage_url, event_url, brand_color, priority, category)
values
  ('starbucks', '스타벅스', 'https://www.starbucks.co.kr', 'https://www.starbucks.co.kr/whats_new/campaign_list.do', '#00754A', 10, '카페'),
  ('twosome', '투썸플레이스', 'https://www.twosome.co.kr', 'https://www.twosome.co.kr/so/storeStartupInfo.do', '#D50032', 11, '카페'),
  ('ediya', '이디야커피', 'https://www.ediya.com', 'https://www.ediya.com/contents/event.html', '#193B7A', 12, '카페'),
  ('megacoffee', '메가MGC커피', 'https://www.mega-mgccoffee.com', 'https://www.mega-mgccoffee.com/bbs/?bbs_category=3', '#F9C900', 13, '카페'),
  ('compose', '컴포즈커피', 'https://composecoffee.com', 'https://composecoffee.com/board/event', '#F5C400', 14, '카페'),
  ('paik', '빽다방', 'https://paikdabang.com', 'https://paikdabang.com/news/', '#FFE800', 15, '카페'),
  ('parisbaguette', '파리바게뜨', 'https://www.paris.co.kr', 'https://www.paris.co.kr/promotion/', '#00529B', 20, '베이커리'),
  ('touslesjours', '뚜레쥬르', 'https://www.tlj.co.kr:7008', 'https://www.tlj.co.kr:7008/brand/event/list.asp', '#0B6B3A', 21, '베이커리'),
  ('baskinrobbins', '배스킨라빈스', 'https://www.baskinrobbins.co.kr', 'https://www.baskinrobbins.co.kr/play/event/list.php', '#E5007D', 22, '디저트'),
  ('mcdonalds', '맥도날드', 'https://www.mcdonalds.co.kr', 'https://www.mcdonalds.co.kr/kor/promotion/list.do', '#DA291C', 30, '외식'),
  ('burgerking', '버거킹', 'https://www.burgerking.co.kr', 'https://www.burgerking.co.kr/#/event', '#D62300', 31, '외식'),
  ('momstouch', '맘스터치', 'https://momstouch.co.kr', 'https://momstouch.co.kr/event/event.php', '#E31837', 32, '외식'),
  ('cu', 'CU', 'https://cu.bgfretail.com', 'https://cu.bgfretail.com/event/plus.do?category=event&depth2=1&sf=N', '#652D90', 40, '편의점'),
  ('gs25', 'GS25', 'https://gs25.gsretail.com', 'https://gs25.gsretail.com/gscvs/ko/customer-engagement/event/current-events', '#007CFF', 41, '편의점'),
  ('seveneleven', '세븐일레븐', 'https://www.7-eleven.co.kr', 'https://www.7-eleven.co.kr/event/eventList.asp', '#008061', 42, '편의점'),
  ('emart24', '이마트24', 'https://emart24.co.kr', 'https://emart24.co.kr/event/ing', '#FFB81C', 43, '편의점'),
  ('oliveyoung', '올리브영', 'https://www.oliveyoung.co.kr', 'https://www.oliveyoung.co.kr/store/counsel/getEventList.do', '#9ACD32', 50, '쇼핑'),
  ('daiso', '다이소', 'https://www.daiso.co.kr', 'https://www.daiso.co.kr/cs/notice', '#E52330', 51, '생활')
on conflict (id) do update set
  homepage_url = excluded.homepage_url,
  event_url = excluded.event_url,
  brand_color = excluded.brand_color,
  priority = excluded.priority,
  updated_at = now();
