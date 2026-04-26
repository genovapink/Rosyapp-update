-- Prevent broad listing of public storage buckets while keeping public file URLs usable
DROP POLICY IF EXISTS "Anyone can view waste images" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Reward images publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Promotion images are publicly accessible" ON storage.objects;