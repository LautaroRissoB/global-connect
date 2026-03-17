-- ============================================================
-- Migration 006: Plan prices table with history support
-- ============================================================

create table if not exists public.plan_prices (
  id         uuid primary key default gen_random_uuid(),
  plan       text not null check (plan in ('free', 'basic', 'pro')),
  price      numeric(10, 2) not null default 0,
  valid_from date not null default current_date
);

-- Index for fetching the current price per plan
create index if not exists plan_prices_plan_date_idx
  on public.plan_prices (plan, valid_from desc);

-- ── Row-level security ──────────────────────────────────────

alter table public.plan_prices enable row level security;

-- Anyone authenticated can read prices
create policy "Authenticated users can read plan prices"
  on public.plan_prices
  for select
  to authenticated
  using (true);

-- Only admins can insert/update prices
create policy "Admins can manage plan prices"
  on public.plan_prices
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ── Seed initial prices ──────────────────────────────────────

insert into public.plan_prices (plan, price, valid_from) values
  ('free',  0.00,   current_date),
  ('basic', 50.00,  current_date),
  ('pro',   100.00, current_date);
