-- Enable extensions
create extension if not exists "uuid-ossp";

-- Apartments (아파트 단지 정보 + 실거래가)
create table if not exists apartments (
  id text primary key,
  name text not null,
  dong text,
  households integer,
  built_year integer,
  lat float,
  lng float,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists apartment_sizes (
  id uuid default uuid_generate_v4() primary key,
  apt_id text references apartments(id),
  pyeong integer,
  sqm float,
  avg_price integer -- 만원
);

create table if not exists apartment_price_history (
  id uuid default uuid_generate_v4() primary key,
  apt_id text references apartments(id),
  pyeong integer,
  price integer, -- 만원
  deal_date text, -- "2026-03"
  floor integer,
  created_at timestamptz default now()
);

-- Pharmacies (약국)
create table if not exists pharmacies (
  id text primary key,
  name text not null,
  address text,
  phone text,
  lat float,
  lng float,
  is_night_pharmacy boolean default false,
  weekday_hours text,
  weekend_hours text,
  holiday_hours text,
  dong text,
  updated_at timestamptz default now()
);

-- Emergency rooms (응급실/소아응급실)
create table if not exists emergency_rooms (
  id text primary key,
  name text not null,
  address text,
  phone text,
  level text, -- '권역응급의료센터', '지역응급의료기관' etc
  is_pediatric boolean default false,
  lat float,
  lng float,
  distance_km float,
  er_available integer, -- 응급실 가용 병상
  updated_at timestamptz default now()
);

-- News articles (뉴스)
create table if not exists news_articles (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  url text unique,
  source text,
  summary text,
  thumbnail text,
  published_at timestamptz,
  news_type text, -- 'local', 'real_estate', 'general'
  tags text[],
  created_at timestamptz default now()
);

-- Buildings & stores (상가)
create table if not exists buildings (
  id text primary key,
  name text not null,
  address text,
  lat float,
  lng float,
  floors integer,
  total_stores integer,
  image_url text,
  categories text[],
  has_data boolean default false,
  updated_at timestamptz default now()
);

create table if not exists floors (
  id uuid default uuid_generate_v4() primary key,
  building_id text references buildings(id),
  level integer not null,        -- -1=B1, 0=1F, 1=2F ...
  label text not null,           -- "B1", "1F", "2F" ...
  has_restroom boolean default false,
  restroom_code text,
  sort_order integer default 0,
  updated_at timestamptz default now(),
  unique (building_id, label)
);

create table if not exists stores (
  id text primary key,
  building_id text references buildings(id),
  name text not null,
  category text,
  floor_label text,
  phone text,
  hours text,
  is_open boolean,
  x float, y float, w float, h float, -- floor map position
  is_premium boolean default false,
  updated_at timestamptz default now()
);

-- Bus stops (교통)
create table if not exists bus_stops (
  id text primary key,
  name text not null,
  lat float,
  lng float,
  routes jsonb -- [{routeNo, destination, nextArrival}]
);

-- RLS: allow anonymous read
alter table apartments enable row level security;
alter table apartment_sizes enable row level security;
alter table apartment_price_history enable row level security;
alter table pharmacies enable row level security;
alter table emergency_rooms enable row level security;
alter table news_articles enable row level security;
alter table buildings enable row level security;
alter table floors enable row level security;
alter table stores enable row level security;
alter table bus_stops enable row level security;

create policy "Allow anon read" on apartments for select using (true);
create policy "Allow anon read" on apartment_sizes for select using (true);
create policy "Allow anon read" on apartment_price_history for select using (true);
create policy "Allow anon read" on pharmacies for select using (true);
create policy "Allow anon read" on emergency_rooms for select using (true);
create policy "Allow anon read" on news_articles for select using (true);
create policy "Allow anon read" on buildings for select using (true);
create policy "Allow anon read" on floors for select using (true);
create policy "Allow anon read" on stores for select using (true);
create policy "Allow anon read" on bus_stops for select using (true);

-- Community posts (커뮤니티 게시글)
create table if not exists community_posts (
  id          text primary key default gen_random_uuid()::text,
  category    text not null,
  title       text not null,
  content     text not null,
  author      text not null default '익명',
  author_dong text not null default '검단',
  is_anonymous boolean default false,
  view_count   integer default 0,
  like_count   integer default 0,
  comment_count integer default 0,
  is_pinned   boolean default false,
  is_hot      boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table community_posts enable row level security;
create policy "public read"   on community_posts for select using (true);
create policy "public write"  on community_posts for insert with check (true);
create policy "public update" on community_posts for update using (true);
create policy "public delete" on community_posts for delete using (true);

create index if not exists idx_posts_created_at on community_posts(created_at desc);
create index if not exists idx_posts_category   on community_posts(category);

-- Community comments (커뮤니티 댓글)
create table if not exists community_comments (
  id          text primary key default gen_random_uuid()::text,
  post_id     text not null,
  author      text not null default '익명',
  author_dong text not null default '검단',
  content     text not null,
  like_count  integer default 0,
  is_anonymous boolean default false,
  created_at  timestamptz default now()
);

alter table community_comments enable row level security;
create policy "public read"   on community_comments for select using (true);
create policy "public write"  on community_comments for insert with check (true);
create policy "public update" on community_comments for update using (true);
create policy "public delete" on community_comments for delete using (true);

create index if not exists idx_comments_post_id    on community_comments(post_id);
create index if not exists idx_comments_created_at on community_comments(created_at asc);
