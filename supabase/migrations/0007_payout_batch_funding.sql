alter table public.payout_batches
  add column if not exists funding_status text not null default 'not_started'
    check (funding_status in ('not_started', 'checkout_created', 'paid', 'failed')),
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_payment_charge_id text,
  add column if not exists funded_at timestamptz,
  add column if not exists funding_error text;

create unique index if not exists payout_batches_stripe_checkout_session_id_idx
  on public.payout_batches(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists payout_batches_funding_status_idx
  on public.payout_batches(company_id, funding_status, created_at desc);
