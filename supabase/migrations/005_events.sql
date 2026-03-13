-- ============================================================
-- Migration 005: Events table for tracking user interactions
-- ============================================================

create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  type             text not null,
  establishment_id uuid references public.establishments(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- Index for the most common query: filter by type + range on created_at
create index if not exists events_type_created_idx
  on public.events (type, created_at desc);

-- Index for per-establishment aggregation
create index if not exists events_establishment_idx
  on public.events (establishment_id, created_at desc);

-- ── Row-level security ──────────────────────────────────────

alter table public.events enable row level security;

-- Any authenticated user can insert events (view tracking)
create policy "Users can insert events"
  on public.events
  for insert
  to authenticated
  with check (true);

-- Only admins can read events (for reports)
create policy "Admins can read events"
  on public.events
  for select
  to authenticated
  using (is_admin());
