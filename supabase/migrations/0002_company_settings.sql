alter table public.companies
  add column if not exists guest_discount_type text not null default 'percent' check (guest_discount_type in ('percent', 'fixed')),
  add column if not exists guest_discount_value numeric(12, 2) not null default 10,
  add column if not exists affiliate_payout_type text not null default 'percent' check (affiliate_payout_type in ('percent', 'fixed')),
  add column if not exists affiliate_payout_value numeric(12, 2) not null default 10,
  add column if not exists affiliate_payout_base text not null default 'stay_subtotal' check (affiliate_payout_base in ('stay_subtotal', 'booking_total', 'total_minus_taxes_fees')),
  add column if not exists payout_pay_by_day integer not null default 3 check (payout_pay_by_day between 1 and 28);
