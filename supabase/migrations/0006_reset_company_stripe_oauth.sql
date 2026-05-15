-- Company Stripe connections no longer use OAuth access tokens.
-- Clear previous OAuth/test connection state so companies reconnect through
-- Stripe-hosted Connect onboarding in the active Stripe mode.
update public.companies
set
  stripe_account_id = null,
  stripe_access_token_encrypted = null,
  stripe_connected = false
where
  stripe_account_id is not null
  or stripe_access_token_encrypted is not null
  or stripe_connected is true;
