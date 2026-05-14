create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  affiliate_id uuid references public.affiliates(id) on delete set null,
  payout_batch_id uuid references public.payout_batches(id) on delete set null,
  payout_id uuid references public.payouts(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  source text not null,
  event text not null,
  level text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operational_events_company_created_idx
  on public.operational_events(company_id, created_at desc);

create index if not exists operational_events_source_created_idx
  on public.operational_events(source, created_at desc);

create index if not exists operational_events_level_created_idx
  on public.operational_events(level, created_at desc);

alter table public.operational_events enable row level security;

create policy operational_events_select_company_viewers on public.operational_events
  for select to authenticated
  using (
    public.is_company_viewer(company_id)
    or actor_user_id = auth.uid()
  );
