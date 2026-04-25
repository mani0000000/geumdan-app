ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS open_date date,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS promo_text text,
  ADD COLUMN IF NOT EXISTS emoji text DEFAULT '🏪',
  ADD COLUMN IF NOT EXISTS show_in_openings boolean,
  ADD COLUMN IF NOT EXISTS open_benefit jsonb,
  ADD COLUMN IF NOT EXISTS extra_info jsonb;
