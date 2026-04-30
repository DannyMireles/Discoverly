# Security

Discoverly.ai handles booking revenue, payout state, and guest PII. The MVP uses least privilege and server-only secret handling.

## Row Level Security

RLS is enabled on all tables.

- Company admins can access records for their company only.
- Affiliates can access their affiliate profile, promotions, commissions, payouts, and PII-limited booking summaries only.
- Service-role server functions perform booking sync, commission writes, payout writes, and audit writes.

## Secrets

Lodgify API keys and Stripe secrets must never be exposed to the browser.

- Stripe secret keys stay in server-only environment variables.
- Stripe webhook payloads are verified with the webhook signing secret.
- Lodgify API keys should be stored in Supabase Vault or encrypted server-side storage in production.
- No `NEXT_PUBLIC_` variable should contain a secret.

## Affiliate PII Limits

Affiliates must not see guest email, phone, or raw Lodgify payloads. Use `affiliate_booking_summary` or API serializers that return only:

- booking date
- stay dates
- property
- booking total
- commission amount
- commission status

## Server-only Logic

Commission and payout mutations are server-only. The browser can request actions, but the server validates role, company scope, payout state, and idempotency.

## Webhooks

Stripe webhooks must be signature-verified before processing. Webhook handlers should be idempotent and store Stripe event IDs if event replay becomes a concern.

## Audit Logs

Audit payout approvals, payout processing, affiliate status changes, Lodgify setup confirmation, unmatched promotion mapping, and sensitive settings changes.
