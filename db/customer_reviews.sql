-- Nexora Customer app — service reviews persistence
-- ==================================================
-- Run this ONCE in the shared Supabase project (qwaehqsmodekbgvnaavz):
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- The customer app degrades gracefully if this table is missing, but
-- reviews will NOT persist across refresh/devices until it exists.

create table if not exists public.customer_reviews (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  salon_id text not null,
  service_id text,
  service_name text not null,
  author text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  verified_booking boolean not null default false,
  booking_id text,
  created_at timestamptz not null default now()
);

-- Indexes used by the app + the salons' review aggregates.
create index if not exists customer_reviews_user_idx
  on public.customer_reviews (user_id, created_at desc);
create index if not exists customer_reviews_salon_idx
  on public.customer_reviews (salon_id, created_at desc);

-- Row Level Security: users can only see/manage their OWN reviews.
alter table public.customer_reviews enable row level security;

drop policy if exists "customer_reviews_select_own" on public.customer_reviews;
create policy "customer_reviews_select_own"
  on public.customer_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "customer_reviews_insert_own" on public.customer_reviews;
create policy "customer_reviews_insert_own"
  on public.customer_reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "customer_reviews_update_own" on public.customer_reviews;
create policy "customer_reviews_update_own"
  on public.customer_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "customer_reviews_delete_own" on public.customer_reviews;
create policy "customer_reviews_delete_own"
  on public.customer_reviews for delete
  using (auth.uid() = user_id);

-- Realtime: the app subscribes to its own review changes (multi-device sync).
alter publication supabase_realtime add table public.customer_reviews;
