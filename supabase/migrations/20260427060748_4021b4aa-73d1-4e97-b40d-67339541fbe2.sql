CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
CREATE POLICY "Users can view their friendships"
ON public.friendships
FOR SELECT
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
CREATE POLICY "Users can create friendships"
ON public.friendships
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id);

DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
CREATE POLICY "Users can update their friendships"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;
CREATE POLICY "Users can delete their friendships"
ON public.friendships
FOR DELETE
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);

DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  points_awarded integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their referral activity" ON public.referrals;
CREATE POLICY "Users can view their referral activity"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can create valid referrals" ON public.referrals;
CREATE POLICY "Users can create valid referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referred_id AND referrer_id <> referred_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);

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

  IF referral_count > 4 THEN
    RAISE EXCEPTION 'Referral reward limit reached';
  END IF;

  IF NEW.points_awarded <> 50 THEN
    NEW.points_awarded := 50;
  END IF;

  UPDATE public.profiles
  SET points = points + 50,
      updated_at = now()
  WHERE user_id = NEW.referrer_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_referral_points_on_insert ON public.referrals;
CREATE TRIGGER award_referral_points_on_insert
BEFORE INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.award_referral_points();

DROP POLICY IF EXISTS "Authenticated users can view basic public profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view basic public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();