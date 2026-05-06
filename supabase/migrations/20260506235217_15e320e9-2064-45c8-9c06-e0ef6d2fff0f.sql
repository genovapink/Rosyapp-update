drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can view own avatar objects" on storage.objects;

create policy "Users can view own avatar objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);