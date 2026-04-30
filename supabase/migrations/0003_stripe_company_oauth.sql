-- Add encrypted Stripe access token for per-company OAuth connections
alter table public.companies
  add column if not exists stripe_access_token_encrypted text;
