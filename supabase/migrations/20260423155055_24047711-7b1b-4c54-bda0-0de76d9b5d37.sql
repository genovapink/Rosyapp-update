-- Fix admin update policy on profiles to include WITH CHECK so admins can update any profile
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;

CREATE POLICY "Admins update any profile"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));