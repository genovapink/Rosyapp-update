-- Public aggregate stats table (safe: no personal rows exposed)
CREATE TABLE IF NOT EXISTS public.app_public_stats (
  id boolean PRIMARY KEY DEFAULT true,
  total_users bigint NOT NULL DEFAULT 0,
  total_scans bigint NOT NULL DEFAULT 0,
  total_recycled numeric NOT NULL DEFAULT 0,
  total_listings bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_public_stats_singleton CHECK (id = true)
);

ALTER TABLE public.app_public_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view app public stats" ON public.app_public_stats;
CREATE POLICY "Anyone can view app public stats"
ON public.app_public_stats
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.refresh_app_public_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_public_stats (id, total_users, total_scans, total_recycled, total_listings, updated_at)
  VALUES (
    true,
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.scan_results),
    COALESCE((SELECT sum(total_recycled_kg) FROM public.profiles), 0),
    (SELECT count(*) FROM public.market_listings WHERE status = 'active'),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET total_users = EXCLUDED.total_users,
      total_scans = EXCLUDED.total_scans,
      total_recycled = EXCLUDED.total_recycled,
      total_listings = EXCLUDED.total_listings,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_app_public_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_app_public_stats();
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_stats_on_profiles ON public.profiles;
CREATE TRIGGER refresh_stats_on_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.refresh_app_public_stats_trigger();

DROP TRIGGER IF EXISTS refresh_stats_on_scans ON public.scan_results;
CREATE TRIGGER refresh_stats_on_scans
AFTER INSERT OR UPDATE OR DELETE ON public.scan_results
FOR EACH ROW EXECUTE FUNCTION public.refresh_app_public_stats_trigger();

DROP TRIGGER IF EXISTS refresh_stats_on_listings ON public.market_listings;
CREATE TRIGGER refresh_stats_on_listings
AFTER INSERT OR UPDATE OR DELETE ON public.market_listings
FOR EACH ROW EXECUTE FUNCTION public.refresh_app_public_stats_trigger();

-- App-callable functions no longer need SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.ensure_profile(_nickname text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
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

CREATE OR REPLACE FUNCTION public.get_app_stats()
RETURNS TABLE(total_users bigint, total_scans bigint, total_recycled numeric, total_listings bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.total_users, s.total_scans, s.total_recycled, s.total_listings
  FROM public.app_public_stats s
  WHERE s.id = true;
$$;

CREATE OR REPLACE FUNCTION public.increment_user_activity(_activity text, _points integer DEFAULT 0)
RETURNS TABLE(scans_count integer, listings_count integer, points integer)
LANGUAGE plpgsql
SECURITY INVOKER
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

-- Remove direct execution rights from internal security-definer functions
REVOKE ALL ON FUNCTION public.apply_premium_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_referral_points() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_profile_scan_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_scan_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_conversation_on_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_app_public_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_app_public_stats_trigger() FROM PUBLIC, anon, authenticated;

-- Explicit app function access
REVOKE ALL ON FUNCTION public.ensure_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_user_activity(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_user_activity(text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_app_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_stats() TO anon, authenticated;

-- Backfill and sync existing data
INSERT INTO public.app_public_stats (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
SELECT public.refresh_app_public_stats();