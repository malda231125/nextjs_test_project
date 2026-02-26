-- Create metadata table
create table if not exists public.videos (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null unique,
  iv text not null,
  auth_tag text not null,
  algorithm text not null default 'aes-256-gcm',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.videos add column if not exists is_favorite boolean not null default false;

alter table public.videos enable row level security;

-- User can only see own rows
create policy if not exists "videos_select_own" on public.videos
for select using (auth.uid() = user_id);

create policy if not exists "videos_insert_own" on public.videos
for insert with check (auth.uid() = user_id);

create policy if not exists "videos_delete_own" on public.videos
for delete using (auth.uid() = user_id);

-- Storage bucket setup (run in SQL editor if needed)
insert into storage.buckets (id, name, public)
values ('encrypted-videos', 'encrypted-videos', false)
on conflict (id) do nothing;

-- Storage policies: each user can only access files inside <uid>/ prefix
create policy if not exists "video_bucket_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'encrypted-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy if not exists "video_bucket_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'encrypted-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy if not exists "video_bucket_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'encrypted-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
