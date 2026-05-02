-- Recreate safe helper functions used by the app
CREATE OR REPLACE FUNCTION public.current_usage_period()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT to_char(now(), 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION public.ensure_profile(_nickname text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, nickname, phone)
  VALUES (
    auth.uid(),
    COALESCE(NULLIF(_nickname, ''), 'User'),
    NULLIF(_phone, '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET nickname = COALESCE(public.profiles.nickname, EXCLUDED.nickname),
      phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
      updated_at = now()
  RETURNING * INTO _profile;

  RETURN _profile;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_app_stats()
RETURNS TABLE(total_users bigint, total_scans bigint, total_recycled numeric, total_listings bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles)::bigint AS total_users,
    (SELECT count(*) FROM public.scan_results)::bigint AS total_scans,
    COALESCE((SELECT sum(total_recycled_kg) FROM public.profiles), 0)::numeric AS total_recycled,
    (SELECT count(*) FROM public.market_listings WHERE status = 'active')::bigint AS total_listings;
$$;

REVOKE ALL ON FUNCTION public.get_app_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_user_activity(_activity text, _points integer DEFAULT 0)
RETURNS TABLE(scans_count integer, listings_count integer, points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period text := public.current_usage_period();
  _scans_delta integer := CASE WHEN _activity = 'scan' THEN 1 ELSE 0 END;
  _listings_delta integer := CASE WHEN _activity = 'listing' THEN 1 ELSE 0 END;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _activity NOT IN ('scan', 'listing') THEN
    RAISE EXCEPTION 'Invalid activity';
  END IF;

  PERFORM public.ensure_profile(NULL, NULL);

  INSERT INTO public.usage_counters (user_id, period, scans_count, listings_count)
  VALUES (auth.uid(), _period, _scans_delta, _listings_delta)
  ON CONFLICT (user_id, period) DO UPDATE
  SET scans_count = public.usage_counters.scans_count + EXCLUDED.scans_count,
      listings_count = public.usage_counters.listings_count + EXCLUDED.listings_count,
      updated_at = now();

  UPDATE public.profiles
  SET points = public.profiles.points + GREATEST(_points, 0),
      level = GREATEST(1, floor((public.profiles.points + GREATEST(_points, 0)) / 100)::integer + 1),
      updated_at = now()
  WHERE user_id = auth.uid();

  RETURN QUERY
  SELECT uc.scans_count, uc.listings_count, p.points
  FROM public.usage_counters uc
  JOIN public.profiles p ON p.user_id = uc.user_id
  WHERE uc.user_id = auth.uid() AND uc.period = _period;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_activity(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_activity(text, integer) TO authenticated;

-- Restore public-table triggers that keep data in sync
CREATE OR REPLACE FUNCTION public.refresh_profile_scan_count(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_scans = (
    SELECT count(*)::integer
    FROM public.scan_results
    WHERE user_id = _user_id
  ),
  updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_scan_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_profile_scan_count(OLD.user_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.refresh_profile_scan_count(OLD.user_id);
  END IF;

  PERFORM public.refresh_profile_scan_count(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_scan_count_on_scan_change ON public.scan_results;
CREATE TRIGGER sync_profile_scan_count_on_scan_change
AFTER INSERT OR UPDATE OR DELETE ON public.scan_results
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_scan_count();

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_conversation_on_message_insert ON public.messages;
CREATE TRIGGER touch_conversation_on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_conversation_on_message();

CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_count integer;
BEGIN
  SELECT count(*) INTO referral_count
  FROM public.referrals
  WHERE referrer_id = NEW.referrer_id;

  IF referral_count >= 4 THEN
    RAISE EXCEPTION 'Referral reward limit reached';
  END IF;

  NEW.points_awarded := 50;

  UPDATE public.profiles
  SET points = points + 50,
      level = GREATEST(1, floor((points + 50) / 100)::integer + 1),
      updated_at = now()
  WHERE user_id = NEW.referrer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral owner not found';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_referral_points_on_insert ON public.referrals;
CREATE TRIGGER award_referral_points_on_insert
BEFORE INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.award_referral_points();

CREATE OR REPLACE FUNCTION public.apply_premium_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.profiles
    SET is_premium = true,
        premium_until = GREATEST(COALESCE(premium_until, now()), NEW.end_date),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_premium_subscription_on_change ON public.premium_subscriptions;
CREATE TRIGGER apply_premium_subscription_on_change
AFTER INSERT OR UPDATE ON public.premium_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.apply_premium_subscription();

-- Updated-at triggers for public tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS usage_counters_updated_at ON public.usage_counters;
CREATE TRIGGER usage_counters_updated_at
BEFORE UPDATE ON public.usage_counters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_market_listings_updated_at ON public.market_listings;
CREATE TRIGGER update_market_listings_updated_at
BEFORE UPDATE ON public.market_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS rewards_updated_at ON public.rewards;
CREATE TRIGGER rewards_updated_at
BEFORE UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tighten write policies so edited rows still belong to the same owner
DROP POLICY IF EXISTS "Users can update own counters" ON public.usage_counters;
CREATE POLICY "Users can update own counters"
ON public.usage_counters
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own listings" ON public.market_listings;
CREATE POLICY "Users can update own listings"
ON public.market_listings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure realtime covers every main table used by the app
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.market_listings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_subscriptions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.redemptions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_codes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rewards; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_results; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_counters; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.warnings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;