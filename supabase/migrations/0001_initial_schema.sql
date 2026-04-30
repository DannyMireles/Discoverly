create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  lodgify_api_key_encrypted text,
  lodgify_connected boolean not null default false,
  stripe_account_id text,
  stripe_connected boolean not null default false,
  timezone text not null default 'America/Chicago',
  currency_code text not null default 'USD',
  booking_site_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'viewer')),
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  slug text not null,
  status text not null default 'invited' check (status in ('invited', 'active', 'paused', 'archived')),
  invite_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  invite_sent_at timestamptz,
  invite_accepted_at timestamptz,
  stripe_account_id text,
  stripe_connected boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, email),
  unique(company_id, slug)
);

create table public.affiliate_promotions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  public_code text not null,
  lodgify_promotion_name text not null,
  guest_discount_type text not null check (guest_discount_type in ('percent', 'fixed')),
  guest_discount_value numeric(12, 2) not null check (guest_discount_value >= 0),
  affiliate_payout_type text not null check (affiliate_payout_type in ('percent', 'fixed')),
  affiliate_payout_value numeric(12, 2) not null check (affiliate_payout_value >= 0),
  affiliate_payout_base text not null default 'stay_subtotal' check (affiliate_payout_base in ('stay_subtotal', 'booking_total', 'total_minus_taxes_fees')),
  lodgify_setup_status text not null default 'needs_lodgify_setup' check (lodgify_setup_status in ('draft', 'needs_lodgify_setup', 'confirmed')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'expired', 'error')),
  expires_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, public_code),
  unique(company_id, lodgify_promotion_name)
);

create table public.lodgify_properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lodgify_property_id bigint not null,
  name text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, lodgify_property_id)
);

create table public.lodgify_bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lodgify_booking_id bigint not null,
  property_id bigint,
  room_type_id bigint,
  guest_name text,
  guest_email text,
  guest_phone text,
  arrival date,
  departure date,
  booking_status text,
  is_deleted boolean not null default false,
  canceled_at timestamptz,
  currency_code text,
  total_amount numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  amount_due numeric(12, 2) not null default 0,
  stay_subtotal numeric(12, 2) not null default 0,
  promotion_amount numeric(12, 2),
  promotion_description text,
  is_fully_paid boolean not null default false,
  is_affiliate_matched boolean not null default false,
  affiliate_id uuid references public.affiliates(id) on delete set null,
  affiliate_promotion_id uuid references public.affiliate_promotions(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  lodgify_created_at timestamptz,
  lodgify_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, lodgify_booking_id)
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  affiliate_promotion_id uuid not null references public.affiliate_promotions(id) on delete restrict,
  lodgify_booking_id uuid not null references public.lodgify_bookings(id) on delete cascade,
  booking_total numeric(12, 2) not null,
  commission_base_amount numeric(12, 2) not null,
  commission_type text not null check (commission_type in ('percent', 'fixed')),
  commission_value numeric(12, 2) not null,
  commission_amount numeric(12, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'eligible', 'approved', 'paid', 'held', 'canceled', 'clawback_needed')),
  eligible_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, lodgify_booking_id)
);

create table public.payout_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  pay_by date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'processing', 'paid', 'failed', 'canceled')),
  total_amount numeric(12, 2) not null default 0,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, period_start, period_end)
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payout_batch_id uuid not null references public.payout_batches(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'processing', 'paid', 'failed', 'held', 'canceled')),
  stripe_transfer_id text,
  error_message text,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payout_batch_id, affiliate_id)
);

create table public.payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.payouts(id) on delete cascade,
  commission_id uuid not null references public.commissions(id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique(payout_id, commission_id)
);

create table public.unmatched_promotions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lodgify_booking_id uuid not null references public.lodgify_bookings(id) on delete cascade,
  promotion_description text not null,
  promotion_amount numeric(12, 2),
  status text not null default 'open' check (status in ('open', 'mapped', 'ignored', 'reviewed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, lodgify_booking_id, promotion_description)
);

create table public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source text not null,
  status text not null check (status in ('success', 'error', 'running')),
  message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  metadata jsonb
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index companies_slug_idx on public.companies(slug);
create index company_users_user_id_idx on public.company_users(user_id);
create index affiliates_company_status_idx on public.affiliates(company_id, status);
create index affiliates_user_id_idx on public.affiliates(user_id) where user_id is not null;
create index affiliate_promotions_company_status_idx on public.affiliate_promotions(company_id, status);
create index affiliate_promotions_name_idx on public.affiliate_promotions(company_id, lodgify_promotion_name);
create index lodgify_bookings_company_paid_matched_idx on public.lodgify_bookings(company_id, is_fully_paid, is_affiliate_matched);
create index lodgify_bookings_company_arrival_idx on public.lodgify_bookings(company_id, arrival);
create index lodgify_bookings_affiliate_idx on public.lodgify_bookings(affiliate_id) where affiliate_id is not null;
create index commissions_company_status_idx on public.commissions(company_id, status);
create index commissions_affiliate_status_idx on public.commissions(affiliate_id, status);
create index payout_batches_company_period_idx on public.payout_batches(company_id, period_start, period_end);
create index payouts_affiliate_status_idx on public.payouts(affiliate_id, status);
create index unmatched_promotions_company_status_idx on public.unmatched_promotions(company_id, status);
create index sync_logs_company_started_idx on public.sync_logs(company_id, started_at desc);
create index audit_logs_company_created_idx on public.audit_logs(company_id, created_at desc);

create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger affiliates_set_updated_at before update on public.affiliates for each row execute function public.set_updated_at();
create trigger affiliate_promotions_set_updated_at before update on public.affiliate_promotions for each row execute function public.set_updated_at();
create trigger lodgify_properties_set_updated_at before update on public.lodgify_properties for each row execute function public.set_updated_at();
create trigger lodgify_bookings_set_updated_at before update on public.lodgify_bookings for each row execute function public.set_updated_at();
create trigger commissions_set_updated_at before update on public.commissions for each row execute function public.set_updated_at();
create trigger payout_batches_set_updated_at before update on public.payout_batches for each row execute function public.set_updated_at();
create trigger payouts_set_updated_at before update on public.payouts for each row execute function public.set_updated_at();
create trigger unmatched_promotions_set_updated_at before update on public.unmatched_promotions for each row execute function public.set_updated_at();

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_users cu
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_company_viewer(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_users cu
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.role in ('owner', 'admin', 'viewer')
  );
$$;

create or replace function public.current_affiliate_id(target_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from public.affiliates a
  where a.company_id = target_company_id
    and a.user_id = auth.uid()
  limit 1;
$$;

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_promotions enable row level security;
alter table public.lodgify_properties enable row level security;
alter table public.lodgify_bookings enable row level security;
alter table public.commissions enable row level security;
alter table public.payout_batches enable row level security;
alter table public.payouts enable row level security;
alter table public.payout_items enable row level security;
alter table public.unmatched_promotions enable row level security;
alter table public.sync_logs enable row level security;
alter table public.audit_logs enable row level security;

create policy companies_select_members on public.companies
  for select to authenticated
  using (
    public.is_company_viewer(id)
    or exists (
      select 1 from public.affiliates a
      where a.company_id = companies.id and a.user_id = auth.uid()
    )
  );

create policy companies_insert_authenticated on public.companies
  for insert to authenticated
  with check (true);

create policy companies_update_admin on public.companies
  for update to authenticated
  using (public.is_company_admin(id))
  with check (public.is_company_admin(id));

create policy company_users_select_members on public.company_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_company_admin(company_id));

create policy company_users_admin_write on public.company_users
  for all to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy affiliates_select_scoped on public.affiliates
  for select to authenticated
  using (public.is_company_viewer(company_id) or user_id = auth.uid());

create policy affiliates_admin_insert on public.affiliates
  for insert to authenticated
  with check (public.is_company_admin(company_id));

create policy affiliates_admin_update on public.affiliates
  for update to authenticated
  using (public.is_company_admin(company_id) or user_id = auth.uid())
  with check (public.is_company_admin(company_id) or user_id = auth.uid());

create policy affiliate_promotions_select_scoped on public.affiliate_promotions
  for select to authenticated
  using (
    public.is_company_viewer(company_id)
    or affiliate_id = public.current_affiliate_id(company_id)
  );

create policy affiliate_promotions_admin_write on public.affiliate_promotions
  for all to authenticated
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy lodgify_properties_admin_read on public.lodgify_properties
  for select to authenticated
  using (public.is_company_viewer(company_id));

create policy lodgify_bookings_admin_read on public.lodgify_bookings
  for select to authenticated
  using (public.is_company_viewer(company_id));

create policy commissions_select_scoped on public.commissions
  for select to authenticated
  using (
    public.is_company_viewer(company_id)
    or affiliate_id = public.current_affiliate_id(company_id)
  );

create policy payout_batches_admin_read on public.payout_batches
  for select to authenticated
  using (public.is_company_viewer(company_id));

create policy payouts_select_scoped on public.payouts
  for select to authenticated
  using (
    public.is_company_viewer(company_id)
    or affiliate_id = public.current_affiliate_id(company_id)
  );

create policy payout_items_select_scoped on public.payout_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.payouts p
      where p.id = payout_items.payout_id
        and (
          public.is_company_viewer(p.company_id)
          or p.affiliate_id = public.current_affiliate_id(p.company_id)
        )
    )
  );

create policy unmatched_promotions_admin_read on public.unmatched_promotions
  for select to authenticated
  using (public.is_company_viewer(company_id));

create policy sync_logs_admin_read on public.sync_logs
  for select to authenticated
  using (public.is_company_viewer(company_id));

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using (public.is_company_viewer(company_id));

create or replace view public.affiliate_booking_summary
with (security_invoker = false)
as
select
  b.company_id,
  b.affiliate_id,
  b.id as booking_id,
  b.lodgify_booking_id,
  b.lodgify_created_at::date as booking_date,
  b.arrival,
  b.departure,
  p.name as property_name,
  b.total_amount as booking_total,
  b.stay_subtotal,
  c.commission_amount,
  c.status as commission_status
from public.lodgify_bookings b
join public.commissions c on c.lodgify_booking_id = b.id
left join public.lodgify_properties p
  on p.company_id = b.company_id
 and p.lodgify_property_id = b.property_id
where b.is_fully_paid = true
  and b.is_affiliate_matched = true
  and (
    public.is_company_viewer(b.company_id)
    or b.affiliate_id = public.current_affiliate_id(b.company_id)
  );

grant select on public.affiliate_booking_summary to authenticated;

insert into public.companies (
  name,
  slug,
  timezone,
  currency_code,
  booking_site_url
)
values (
  'Zenful Cove',
  'ZENCOVE',
  'America/Chicago',
  'USD',
  'https://zenfulcove.com'
)
on conflict (slug) do nothing;
