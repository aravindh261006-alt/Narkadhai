-- ============================================================
-- NARKADHAI — SUPABASE SCHEMA
-- Run this entire file in the Supabase SQL Editor after
-- creating your project.
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Members
create table if not exists public.members (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  role          text not null,
  bio           text,
  photo_url     text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Audit documents
create table if not exists public.audit_docs (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  file_url      text not null,
  uploaded_by   text not null,
  uploaded_at   timestamptz not null default now()
);

-- Albums (a visit to a home)
create table if not exists public.albums (
  id             uuid primary key default uuid_generate_v4(),
  home_name      text not null,
  visit_date     date not null,
  description    text,
  cover_photo_url text,
  created_at     timestamptz not null default now()
);

-- Album photos
create table if not exists public.album_photos (
  id         uuid primary key default uuid_generate_v4(),
  album_id   uuid not null references public.albums(id) on delete cascade,
  photo_url  text not null,
  caption    text,
  created_at timestamptz not null default now()
);

-- Donations (self-reported by donors)
create table if not exists public.donations (
  id             uuid primary key default uuid_generate_v4(),
  donor_name     text not null,
  donor_email    text not null,
  amount         numeric(12,2) not null check (amount > 0),
  utr_or_txn_id  text,
  screenshot_url text,
  status         text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at     timestamptz not null default now(),
  verified_at    timestamptz,
  verified_by    text
);

-- Site settings (key-value store)
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- Insert defaults (safe to re-run: ON CONFLICT DO NOTHING)
insert into public.settings (key, value) values
  ('donation_target_amount', '100000'),
  ('qr_code_url', ''),
  ('instagram_url', 'https://www.instagram.com/narkadhai'),
  ('instagram_handle', '@narkadhai'),
  ('mission_text', 'Narkadhai is an informal initiative that visits children''s homes and old-age homes, collecting voluntary donations to support them. We believe in radical transparency — every rupee is accounted for and our books are open.'),
  ('about_text', 'Narkadhai was started by a group of friends who wanted to make a direct, tangible difference in their community. We visit homes, connect with the people there, and channel voluntary donations to meet their needs.'),
  ('contact_email', 'support.narkadhai@gmail.com'),
  ('owner_name', 'Narkadhai Owner'),
  ('owner_bio', 'Founder of the Narkadhai initiative.'),
  ('owner_photo_url', '')
ON CONFLICT (key) DO NOTHING;

-- Authorized admins (allow-list)
create table if not exists public.authorized_admins (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null unique,
  name       text not null,
  role       text not null default 'audit' check (role in ('owner', 'audit')),
  created_at timestamptz not null default now()
);

-- Contact messages
create table if not exists public.contact_messages (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now(),
  is_read    boolean not null default false
);

-- Rate limit log (used by backend to prevent spam on public forms)
create table if not exists public.rate_limit_log (
  id         bigserial primary key,
  ip_hash    text not null,
  endpoint   text not null,
  created_at timestamptz not null default now()
);
-- Index for fast cleanup queries
create index if not exists idx_rate_limit_log_ip_endpoint_time
  on public.rate_limit_log (ip_hash, endpoint, created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.members           enable row level security;
alter table public.audit_docs        enable row level security;
alter table public.albums            enable row level security;
alter table public.album_photos      enable row level security;
alter table public.donations         enable row level security;
alter table public.settings          enable row level security;
alter table public.authorized_admins enable row level security;
alter table public.contact_messages  enable row level security;
alter table public.rate_limit_log    enable row level security;

-- ---- members ----
-- Public can read members
create policy "Public read members"
  on public.members for select
  using (true);
-- Only service role can write (handled via backend with service key)
-- No insert/update/delete policy for anon/authenticated = blocked

-- ---- audit_docs ----
create policy "Public read audit_docs"
  on public.audit_docs for select
  using (true);

-- ---- albums ----
create policy "Public read albums"
  on public.albums for select
  using (true);

-- ---- album_photos ----
create policy "Public read album_photos"
  on public.album_photos for select
  using (true);

-- ---- donations ----
-- NO public read of individual donation rows (PII protection)
-- Aggregate totals are served via backend API using service role
-- No RLS select policy for anon = blocked by default

-- ---- settings ----
create policy "Public read settings"
  on public.settings for select
  using (true);

-- ---- authorized_admins ----
-- Completely locked down — no public access
-- Backend uses service role key only

-- ---- contact_messages ----
-- No public read — only backend (service role) inserts and reads

-- ---- rate_limit_log ----
-- No public access — backend (service role) only

-- ============================================================
-- AGGREGATE FUNCTION — PUBLIC DONATION TOTALS
-- Returns only aggregate data, no PII
-- ============================================================
create or replace function public.get_donation_totals()
returns table (
  reported_total   numeric,
  verified_total   numeric,
  reported_count   integer,
  verified_count   integer
)
language sql
security definer
as $$
  select
    coalesce(sum(amount) filter (where status in ('pending', 'verified')), 0) as reported_total,
    coalesce(sum(amount) filter (where status = 'verified'), 0)               as verified_total,
    count(*)             filter (where status in ('pending', 'verified'))     as reported_count,
    count(*)             filter (where status = 'verified')                   as verified_count
  from public.donations;
$$;

-- Grant anon execute on the aggregate function
grant execute on function public.get_donation_totals() to anon;
grant execute on function public.get_donation_totals() to authenticated;

-- ============================================================
-- STORAGE BUCKETS
-- Create these manually in the Supabase dashboard → Storage,
-- or run via Supabase Management API. The SQL below uses
-- storage schema inserts as a fallback (may require service role).
-- ============================================================
-- Bucket: album-photos (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album-photos', 'album-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- Bucket: audit-docs (public read — PDFs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audit-docs', 'audit-docs', true, 20971520, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Bucket: member-photos (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Bucket: qr-codes (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr-codes', 'qr-codes', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Bucket: donation-screenshots (private — NOT public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('donation-screenshots', 'donation-screenshots', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ============================================================
-- STORAGE RLS — public buckets: anyone can read
-- ============================================================
create policy "Public read album-photos"
  on storage.objects for select
  using (bucket_id = 'album-photos');

create policy "Public read audit-docs"
  on storage.objects for select
  using (bucket_id = 'audit-docs');

create policy "Public read member-photos"
  on storage.objects for select
  using (bucket_id = 'member-photos');

create policy "Public read qr-codes"
  on storage.objects for select
  using (bucket_id = 'qr-codes');

-- donation-screenshots: NO public read policy (blocked by default)
