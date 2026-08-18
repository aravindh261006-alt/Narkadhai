-- ============================================================
-- NARKADHAI — SUPABASE STORAGE BUCKETS & RLS POLICIES SETUP
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- 1. Create or update the storage buckets
-- Public buckets: album-photos, audit-docs, member-photos, qr-codes
-- Private bucket: donation-screenshots

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('album-photos', 'album-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('audit-docs', 'audit-docs', true, 20971520, array['application/pdf','image/jpeg','image/png']),
  ('member-photos', 'member-photos', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('qr-codes', 'qr-codes', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('donation-screenshots', 'donation-screenshots', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Public Read Policies for public buckets
drop policy if exists "Public read album-photos" on storage.objects;
create policy "Public read album-photos"
  on storage.objects for select
  using (bucket_id = 'album-photos');

drop policy if exists "Public read audit-docs" on storage.objects;
create policy "Public read audit-docs"
  on storage.objects for select
  using (bucket_id = 'audit-docs');

drop policy if exists "Public read member-photos" on storage.objects;
create policy "Public read member-photos"
  on storage.objects for select
  using (bucket_id = 'member-photos');

drop policy if exists "Public read qr-codes" on storage.objects;
create policy "Public read qr-codes"
  on storage.objects for select
  using (bucket_id = 'qr-codes');

-- 3. Authenticated Admin Policies (member-photos)
drop policy if exists "Authenticated insert member-photos" on storage.objects;
create policy "Authenticated insert member-photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-photos');

drop policy if exists "Authenticated update member-photos" on storage.objects;
create policy "Authenticated update member-photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'member-photos');

drop policy if exists "Authenticated delete member-photos" on storage.objects;
create policy "Authenticated delete member-photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-photos');

-- 4. Authenticated Admin Policies (qr-codes)
drop policy if exists "Authenticated insert qr-codes" on storage.objects;
create policy "Authenticated insert qr-codes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'qr-codes');

drop policy if exists "Authenticated update qr-codes" on storage.objects;
create policy "Authenticated update qr-codes"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'qr-codes');

drop policy if exists "Authenticated delete qr-codes" on storage.objects;
create policy "Authenticated delete qr-codes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'qr-codes');

-- 5. Authenticated Admin Policies (album-photos)
drop policy if exists "Authenticated insert album-photos" on storage.objects;
create policy "Authenticated insert album-photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'album-photos');

drop policy if exists "Authenticated update album-photos" on storage.objects;
create policy "Authenticated update album-photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'album-photos');

drop policy if exists "Authenticated delete album-photos" on storage.objects;
create policy "Authenticated delete album-photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'album-photos');

-- 6. Authenticated Admin Policies (audit-docs)
drop policy if exists "Authenticated insert audit-docs" on storage.objects;
create policy "Authenticated insert audit-docs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audit-docs');

drop policy if exists "Authenticated update audit-docs" on storage.objects;
create policy "Authenticated update audit-docs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'audit-docs');

drop policy if exists "Authenticated delete audit-docs" on storage.objects;
create policy "Authenticated delete audit-docs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'audit-docs');

-- 7. Donation Screenshots Policies (Public upload, Authenticated read)
drop policy if exists "Anyone can upload donation screenshots" on storage.objects;
create policy "Anyone can upload donation screenshots"
  on storage.objects for insert
  to public
  with check (bucket_id = 'donation-screenshots');

drop policy if exists "Authenticated read donation screenshots" on storage.objects;
create policy "Authenticated read donation screenshots"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'donation-screenshots');
