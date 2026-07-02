-- Security hardening: remove anonymous admin writes and scope user data to auth.uid().

CREATE OR REPLACE FUNCTION pg_temp.drop_all_policies(p_table TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p_table);
  END LOOP;
END;
$$;

-- Remove generic policies that previously granted anonymous admin writes.
DO $$
DECLARE
  t TEXT;
  p TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'banners','buildings','floors','stores','store_coupons','store_openings',
    'pharmacies','emergency_rooms','news_articles','apartments','apartment_sizes',
    'apartment_price_history','apt_price_index','home_widget_config','places',
    'search_keywords','marts','site_settings','youtube_videos','instagram_posts',
    'sports_matches','sport_categories','leagues','teams','broadcasters','popups','terms'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOREACH p IN ARRAY ARRAY['anon_insert','anon_update','anon_delete','anon_write','anon_all'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "places_admin_all" ON places;
DROP POLICY IF EXISTS "search_keywords_admin" ON search_keywords;
DROP POLICY IF EXISTS "Allow service write" ON popups;
DROP POLICY IF EXISTS "Allow service write" ON instagram_posts;
DROP POLICY IF EXISTS "service write" ON terms;
DROP POLICY IF EXISTS "store_suggestions_admin" ON store_suggestions;

-- Store administration data is public-read only; service_role performs writes.
DROP POLICY IF EXISTS "store_menus_anon_write" ON store_menus;
DROP POLICY IF EXISTS "store_hours_anon_write" ON store_hours;
DROP POLICY IF EXISTS "store_events_anon_write" ON store_events;
SELECT pg_temp.drop_all_policies('store_reservations');
SELECT pg_temp.drop_all_policies('store_waitings');
SELECT pg_temp.drop_all_policies('coupon_uses');

ALTER TABLE store_reservations ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE store_waitings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE coupon_uses ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_store_reservations_user_id ON store_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_store_waitings_user_id ON store_waitings(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_user_id ON coupon_uses(user_id);

CREATE POLICY "store_reservations_own_rows" ON store_reservations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "store_waitings_own_rows" ON store_waitings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "coupon_uses_own_rows" ON coupon_uses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION assign_store_waiting_queue_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.store_id));
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO NEW.queue_number
  FROM store_waitings
  WHERE store_id = NEW.store_id AND status IN ('waiting', 'called');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_waiting_queue_number_trigger ON store_waitings;
CREATE TRIGGER store_waiting_queue_number_trigger
BEFORE INSERT ON store_waitings
FOR EACH ROW EXECUTE FUNCTION assign_store_waiting_queue_number();

-- User-owned data.
SELECT pg_temp.drop_all_policies('users');
CREATE POLICY "users_own_rows" ON users
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_favorite_buses','user_favorite_stores','user_favorite_apts','user_coupons',
    'user_settings','user_point_history','user_mission_completions',
    'user_reward_redemptions','user_favorite_places','user_favorite_posts','user_points'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      PERFORM pg_temp.drop_all_policies(t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
        t || '_own_rows', t
      );
    END IF;
  END LOOP;
END;
$$;

SELECT pg_temp.drop_all_policies('membership_grades');
CREATE POLICY "membership_grades_public_read" ON membership_grades
  FOR SELECT TO anon, authenticated USING (true);

-- Private member history and notifications.
SELECT pg_temp.drop_all_policies('user_login_history');
CREATE POLICY "login_history_own_read" ON user_login_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());

SELECT pg_temp.drop_all_policies('user_consent_history');
CREATE POLICY "consent_history_own_read" ON user_consent_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());

SELECT pg_temp.drop_all_policies('admin_member_logs');
REVOKE ALL ON admin_member_logs FROM anon, authenticated;
DO $$
BEGIN
  IF to_regclass('public.user_activity_stats') IS NOT NULL THEN
    REVOKE SELECT ON user_activity_stats FROM anon, authenticated;
  END IF;
END;
$$;

SELECT pg_temp.drop_all_policies('notifications');
CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_own_delete" ON notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Community content is readable by everyone but writable only by its owner.
SELECT pg_temp.drop_all_policies('community_posts');
CREATE POLICY "community_posts_public_read" ON community_posts
  FOR SELECT TO anon, authenticated USING (COALESCE(is_hidden, false) = false);
CREATE POLICY "community_posts_owner_insert" ON community_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_posts_owner_update" ON community_posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_posts_owner_delete" ON community_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

SELECT pg_temp.drop_all_policies('community_comments');
CREATE POLICY "community_comments_public_read" ON community_comments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "community_comments_owner_insert" ON community_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_comments_owner_update" ON community_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_comments_owner_delete" ON community_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

SELECT pg_temp.drop_all_policies('post_reports');
CREATE POLICY "post_reports_authenticated_insert" ON post_reports
  FOR INSERT TO authenticated WITH CHECK (true);

SELECT pg_temp.drop_all_policies('post_hidden');
CREATE POLICY "post_hidden_own_rows" ON post_hidden
  FOR ALL TO authenticated
  USING (hidden_by = auth.uid()::TEXT)
  WITH CHECK (hidden_by = auth.uid()::TEXT);

-- Normalize both legacy and v2 review schemas before applying owner policies.
DO $$
DECLARE
  had_hidden BOOLEAN;
  had_visible BOOLEAN;
  id_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_reviews' AND column_name = 'is_hidden'
  ) INTO had_hidden;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_reviews' AND column_name = 'is_visible'
  ) INTO had_visible;

  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS user_id TEXT;
  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS nickname TEXT;
  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS author_nickname TEXT;
  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS owner_reply TEXT;

  IF had_hidden AND NOT had_visible THEN
    UPDATE store_reviews SET is_visible = NOT COALESCE(is_hidden, false);
  ELSIF had_visible AND NOT had_hidden THEN
    UPDATE store_reviews SET is_hidden = NOT COALESCE(is_visible, true);
  END IF;

  UPDATE store_reviews
  SET nickname = COALESCE(NULLIF(nickname, ''), NULLIF(author_nickname, ''), '검단주민'),
      author_nickname = COALESCE(NULLIF(author_nickname, ''), NULLIF(nickname, ''), '검단주민'),
      media_urls = CASE WHEN cardinality(media_urls) > 0 THEN media_urls ELSE COALESCE(images, '{}') END,
      images = CASE WHEN cardinality(images) > 0 THEN images ELSE COALESCE(media_urls, '{}') END;

  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'store_reviews' AND column_name = 'id';
  IF id_type = 'text' THEN
    ALTER TABLE store_reviews ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_store_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.nickname := COALESCE(NULLIF(NEW.nickname, ''), NULLIF(NEW.author_nickname, ''), '검단주민');
  NEW.author_nickname := COALESCE(NULLIF(NEW.author_nickname, ''), NEW.nickname);
  NEW.media_urls := CASE WHEN cardinality(NEW.media_urls) > 0 THEN NEW.media_urls ELSE COALESCE(NEW.images, '{}') END;
  NEW.images := CASE WHEN cardinality(NEW.images) > 0 THEN NEW.images ELSE COALESCE(NEW.media_urls, '{}') END;
  IF TG_OP = 'UPDATE' AND NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
      AND NEW.is_visible IS NOT DISTINCT FROM OLD.is_visible THEN
    NEW.is_visible := NOT NEW.is_hidden;
  ELSE
    NEW.is_visible := COALESCE(NEW.is_visible, NOT COALESCE(NEW.is_hidden, false), true);
    NEW.is_hidden := NOT NEW.is_visible;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_store_review_trigger ON store_reviews;
CREATE TRIGGER normalize_store_review_trigger
BEFORE INSERT OR UPDATE ON store_reviews
FOR EACH ROW EXECUTE FUNCTION normalize_store_review();

SELECT pg_temp.drop_all_policies('store_reviews');
CREATE POLICY "store_reviews_public_read" ON store_reviews
  FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "store_reviews_owner_insert" ON store_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::TEXT);
CREATE POLICY "store_reviews_owner_update" ON store_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid()::TEXT) WITH CHECK (user_id = auth.uid()::TEXT);
CREATE POLICY "store_reviews_owner_delete" ON store_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid()::TEXT);

-- One reaction per authenticated user and target.
CREATE TABLE IF NOT EXISTS community_reactions (
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_id)
);
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_reactions_own_rows" ON community_reactions;
CREATE POLICY "community_reactions_own_rows" ON community_reactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION set_community_reaction(
  p_target_type TEXT,
  p_target_id TEXT,
  p_liked BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_target_type NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_liked THEN
    INSERT INTO community_reactions(user_id, target_type, target_id)
    VALUES (auth.uid(), p_target_type, p_target_id)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM community_reactions
    WHERE user_id = auth.uid() AND target_type = p_target_type AND target_id = p_target_id;
  END IF;

  IF p_target_type = 'post' THEN
    UPDATE community_posts
    SET like_count = (
      SELECT COUNT(*) FROM community_reactions
      WHERE target_type = 'post' AND target_id = p_target_id
    )
    WHERE id = p_target_id;
  ELSE
    UPDATE community_comments
    SET like_count = (
      SELECT COUNT(*) FROM community_reactions
      WHERE target_type = 'comment' AND target_id = p_target_id
    )
    WHERE id = p_target_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION set_community_reaction(TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_community_reaction(TEXT, TEXT, BOOLEAN) TO authenticated;

-- Public media stays readable, but only authenticated users may manage their own paths.
DROP POLICY IF EXISTS "admin_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "admin_images_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "admin_images_user_update" ON storage.objects;
DROP POLICY IF EXISTS "admin_images_user_delete" ON storage.objects;
CREATE POLICY "admin_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'admin-images');
CREATE POLICY "admin_images_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'admin-images'
    AND (storage.foldername(name))[1] IN ('community', 'avatars')
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );
CREATE POLICY "admin_images_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'admin-images'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'admin-images'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );
CREATE POLICY "admin_images_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'admin-images'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "community_videos_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "community_videos_anon_delete" ON storage.objects;
DROP POLICY IF EXISTS "community_videos_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "community_videos_user_delete" ON storage.objects;
CREATE POLICY "community_videos_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
CREATE POLICY "community_videos_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE OR REPLACE FUNCTION refresh_community_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_post_id TEXT;
BEGIN
  v_post_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.post_id ELSE NEW.post_id END;
  UPDATE community_posts
  SET comment_count = (
    SELECT COUNT(*) FROM community_comments
    WHERE post_id = v_post_id
  )
  WHERE id = v_post_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_comment_count_trigger ON community_comments;
CREATE TRIGGER community_comment_count_trigger
AFTER INSERT OR DELETE ON community_comments
FOR EACH ROW EXECUTE FUNCTION refresh_community_comment_count();
