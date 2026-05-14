alter table public.affiliates
  add column if not exists created_via text not null default 'company_portal'
    check (created_via in ('company_portal', 'public_invite_link', 'system')),
  add column if not exists created_via_reference text,
  add column if not exists owner_notified_at timestamptz,
  add column if not exists owner_notification_error text;

create index if not exists affiliates_created_via_idx
  on public.affiliates(company_id, created_via, created_at desc);
