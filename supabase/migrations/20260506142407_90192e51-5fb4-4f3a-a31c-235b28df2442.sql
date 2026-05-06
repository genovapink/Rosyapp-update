-- Move role checks to a private helper schema so it is usable by RLS but not exposed as a public API RPC
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated;

-- Replace public role helper references in table policies
DROP POLICY IF EXISTS "Admins can delete any listing" ON public.market_listings;
CREATE POLICY "Admins can delete any listing"
ON public.market_listings
FOR DELETE
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all listings" ON public.market_listings;
CREATE POLICY "Admins can view all listings"
ON public.market_listings
FOR SELECT
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage premium" ON public.premium_subscriptions;
CREATE POLICY "Admins manage premium"
ON public.premium_subscriptions
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users view own premium" ON public.premium_subscriptions;
CREATE POLICY "Users view own premium"
ON public.premium_subscriptions
FOR SELECT
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile"
ON public.profiles
FOR UPDATE
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete promotions" ON public.promotions;
CREATE POLICY "Admins can delete promotions"
ON public.promotions
FOR DELETE
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert promotions" ON public.promotions;
CREATE POLICY "Admins can insert promotions"
ON public.promotions
FOR INSERT
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update promotions" ON public.promotions;
CREATE POLICY "Admins can update promotions"
ON public.promotions
FOR UPDATE
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all promotions" ON public.promotions;
CREATE POLICY "Admins can view all promotions"
ON public.promotions
FOR SELECT
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update redemptions" ON public.redemptions;
CREATE POLICY "Admins update redemptions"
ON public.redemptions
FOR UPDATE
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users view own redemptions" ON public.redemptions;
CREATE POLICY "Users view own redemptions"
ON public.redemptions
FOR SELECT
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all reward codes" ON public.reward_codes;
CREATE POLICY "Admins can view all reward codes"
ON public.reward_codes
FOR SELECT
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage codes" ON public.reward_codes;
CREATE POLICY "Admins manage codes"
ON public.reward_codes
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage rewards" ON public.rewards;
CREATE POLICY "Admins manage rewards"
ON public.rewards
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone view active rewards" ON public.rewards;
CREATE POLICY "Anyone view active rewards"
ON public.rewards
FOR SELECT
USING ((is_active = true) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users view own counters" ON public.usage_counters;
CREATE POLICY "Users view own counters"
ON public.usage_counters
FOR SELECT
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage warnings" ON public.warnings;
CREATE POLICY "Admins manage warnings"
ON public.warnings
FOR ALL
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users view own warnings" ON public.warnings;
CREATE POLICY "Users view own warnings"
ON public.warnings
FOR SELECT
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- Replace public role helper references in storage policies
DROP POLICY IF EXISTS "Admins can upload promotion images" ON storage.objects;
CREATE POLICY "Admins can upload promotion images"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK ((bucket_id = 'promotions') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update promotion images" ON storage.objects;
CREATE POLICY "Admins can update promotion images"
ON storage.objects
FOR UPDATE TO authenticated
USING ((bucket_id = 'promotions') AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((bucket_id = 'promotions') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete promotion images" ON storage.objects;
CREATE POLICY "Admins can delete promotion images"
ON storage.objects
FOR DELETE TO authenticated
USING ((bucket_id = 'promotions') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can upload reward images" ON storage.objects;
CREATE POLICY "Admins can upload reward images"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update reward images" ON storage.objects;
CREATE POLICY "Admins can update reward images"
ON storage.objects
FOR UPDATE TO authenticated
USING ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete reward images" ON storage.objects;
CREATE POLICY "Admins can delete reward images"
ON storage.objects
FOR DELETE TO authenticated
USING ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins upload rewards" ON storage.objects;
CREATE POLICY "Admins upload rewards"
ON storage.objects
FOR INSERT
WITH CHECK ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update rewards" ON storage.objects;
CREATE POLICY "Admins update rewards"
ON storage.objects
FOR UPDATE
USING ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete rewards" ON storage.objects;
CREATE POLICY "Admins delete rewards"
ON storage.objects
FOR DELETE
USING ((bucket_id = 'rewards') AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- Close the public API callable version so it cannot cause function permission errors or security warnings
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;