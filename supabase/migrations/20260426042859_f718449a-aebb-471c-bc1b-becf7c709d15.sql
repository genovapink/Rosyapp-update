-- Allow admins to manage reward images in the rewards bucket
DROP POLICY IF EXISTS "Admins can upload reward images" ON storage.objects;
CREATE POLICY "Admins can upload reward images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rewards'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can update reward images" ON storage.objects;
CREATE POLICY "Admins can update reward images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rewards'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'rewards'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can delete reward images" ON storage.objects;
CREATE POLICY "Admins can delete reward images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'rewards'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to manage promotion images in the promotions bucket
DROP POLICY IF EXISTS "Admins can upload promotion images" ON storage.objects;
CREATE POLICY "Admins can upload promotion images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'promotions'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can update promotion images" ON storage.objects;
CREATE POLICY "Admins can update promotion images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'promotions'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'promotions'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can delete promotion images" ON storage.objects;
CREATE POLICY "Admins can delete promotion images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'promotions'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow regular users to upload their own promotion images under their user id folder
DROP POLICY IF EXISTS "Users can upload own promotion images" ON storage.objects;
CREATE POLICY "Users can upload own promotion images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'promotions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own promotion images" ON storage.objects;
CREATE POLICY "Users can update own promotion images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'promotions'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'promotions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own promotion images" ON storage.objects;
CREATE POLICY "Users can delete own promotion images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'promotions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure deleting a reward also removes its voucher codes
ALTER TABLE public.reward_codes
DROP CONSTRAINT IF EXISTS reward_codes_reward_id_fkey;

ALTER TABLE public.reward_codes
ADD CONSTRAINT reward_codes_reward_id_fkey
FOREIGN KEY (reward_id)
REFERENCES public.rewards(id)
ON DELETE CASCADE;