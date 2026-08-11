alter table public.buildings
  add column if not exists portrait_image_url text;

alter table public.stores
  add column if not exists landscape_image_url text;

-- 기존 대표 이미지를 공통 가로 이미지로 승격한다. 원본은 보존한다.
update public.stores
set landscape_image_url = coalesce(cover_image_url, thumbnail_url)
where landscape_image_url is null
  and coalesce(cover_image_url, thumbnail_url) is not null;

-- 건물의 표시용 집계는 공개 매장 building_id를 단일 기준으로 동기화한다.
update public.buildings building
set total_stores = linked.store_count,
    categories = linked.categories,
    has_data = linked.store_count > 0
from (
  select building_id,
         count(*)::integer as store_count,
         array_agg(distinct category order by category) filter (where category is not null) as categories
  from public.stores
  where is_published = true
    and building_id is not null
  group by building_id
) linked
where building.id = linked.building_id;

update public.buildings building
set total_stores = 0,
    categories = array[]::text[],
    has_data = false
where building.is_published = true
  and not exists (
    select 1 from public.stores store
    where store.building_id = building.id and store.is_published = true
  );

create index if not exists stores_published_building_idx
  on public.stores (building_id, floor_label)
  where is_published = true;

notify pgrst, 'reload schema';
