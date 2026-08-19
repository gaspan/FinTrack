-- FinTrack cloud backup setup.
-- Run once in Supabase Dashboard > SQL Editor.
--
-- PREREQUISITE (dashboard UI, cannot be done in SQL):
--   Authentication > Sign In / Providers > Email:
--     turn "Confirm email" OFF.
--   Usernames map to synthetic emails (<username>@fintrack.app) that receive no
--   mail, so with confirmation ON every account stays unconfirmed and can
--   never sign in.

-- 1. Private bucket for backup JSON files.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- 2. RLS: confine each user to a folder named after their UID.
--    Backup paths are '<user_id>/FinTrack_Backup_<timestamp>.json'.
drop policy if exists "fintrack own folder select" on storage.objects;
drop policy if exists "fintrack own folder insert" on storage.objects;
drop policy if exists "fintrack own folder update" on storage.objects;
drop policy if exists "fintrack own folder delete" on storage.objects;

create policy "fintrack own folder select"
on storage.objects for select to authenticated
using (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "fintrack own folder insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "fintrack own folder update"
on storage.objects for update to authenticated
using (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "fintrack own folder delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'backups'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
