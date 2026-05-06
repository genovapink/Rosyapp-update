-- Backfill missing public profiles for every existing authenticated account.
insert into public.profiles (user_id, nickname, phone)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'nickname', ''), split_part(u.email, '@', 1), 'User'),
  nullif(u.raw_user_meta_data->>'phone', '')
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.id is null
on conflict (user_id) do nothing;

-- Refresh public aggregate stats after profile recovery.
select public.refresh_app_public_stats();

-- Make avatar bucket safely available for public display.
update storage.buckets
set public = true
where id = 'avatars';

-- Replace avatar storage policies with authenticated, folder-scoped rules.
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users upload own avatar" on storage.objects;
drop policy if exists "Users update own avatar" on storage.objects;
drop policy if exists "Users delete own avatar" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists "Users can delete own avatar" on storage.objects;
drop policy if exists "Users can view avatar images" on storage.objects;

create policy "Avatar images are publicly accessible"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);