-- Add link_url for clickable ads
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS link_url text;

-- Create public storage bucket for promotion images
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotions', 'promotions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for promotions bucket
CREATE POLICY "Promotion images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotions');

CREATE POLICY "Admins can upload promotion images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promotions' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update promotion images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'promotions' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete promotion images"
ON storage.objects FOR DELETE
USING (bucket_id = 'promotions' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete promotions
CREATE POLICY "Admins can delete promotions"
ON public.promotions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert promotions on behalf of any user
CREATE POLICY "Admins can insert promotions"
ON public.promotions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any promotion
CREATE POLICY "Admins can update promotions"
ON public.promotions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));