DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.market_listings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_counters;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rewards;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_codes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.redemptions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.warnings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.get_app_stats()
RETURNS TABLE(total_users bigint, total_scans bigint, total_recycled numeric, total_listings bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM auth.users)::bigint AS total_users,
    (SELECT count(*) FROM public.scan_results)::bigint AS total_scans,
    COALESCE((SELECT sum(total_recycled_kg) FROM public.profiles), 0)::numeric AS total_recycled,
    (SELECT count(*) FROM public.market_listings WHERE status = 'active')::bigint AS total_listings;
$$;

REVOKE ALL ON FUNCTION public.get_app_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_profile(_nickname text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles;
  _email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.profiles (user_id, nickname, phone)
  VALUES (
    auth.uid(),
    COALESCE(NULLIF(_nickname, ''), split_part(_email, '@', 1), 'User'),
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