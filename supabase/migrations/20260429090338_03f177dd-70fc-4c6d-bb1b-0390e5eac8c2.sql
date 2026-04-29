-- Make auth profile creation idempotent and include optional phone metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nickname, phone)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nickname', ''), split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET nickname = COALESCE(EXCLUDED.nickname, public.profiles.nickname),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = now();

  RETURN NEW;
END;
$$;

-- Fix friendship creation so either scanner direction is allowed
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
CREATE POLICY "Users can create friendships"
ON public.friendships
FOR INSERT
TO authenticated
WITH CHECK (
  requester_id <> addressee_id
  AND (auth.uid() = requester_id OR auth.uid() = addressee_id)
);

-- Fix referral reward cap and make reward update explicit
CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_count integer;
  updated_profiles integer;
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
      updated_at = now()
  WHERE user_id = NEW.referrer_id;

  GET DIAGNOSTICS updated_profiles = ROW_COUNT;
  IF updated_profiles = 0 THEN
    RAISE EXCEPTION 'Referral owner not found';
  END IF;

  RETURN NEW;
END;
$$;