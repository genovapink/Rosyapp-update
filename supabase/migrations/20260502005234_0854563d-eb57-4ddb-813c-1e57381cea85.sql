DROP POLICY IF EXISTS "Admins can view all promotions" ON public.promotions;
CREATE POLICY "Admins can view all promotions"
ON public.promotions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all listings" ON public.market_listings;
CREATE POLICY "Admins can view all listings"
ON public.market_listings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete any listing" ON public.market_listings;
CREATE POLICY "Admins can delete any listing"
ON public.market_listings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all reward codes" ON public.reward_codes;
CREATE POLICY "Admins can view all reward codes"
ON public.reward_codes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));