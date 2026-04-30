# Architecture

Discoverly.ai is a small, security-first SaaS dashboard for affiliate-attributed direct bookings.

## Runtime

- Next.js renders company and affiliate dashboards.
- Supabase Auth owns user identity.
- Supabase Postgres stores companies, affiliates, promotions, Lodgify bookings, commissions, payout batches, payouts, sync logs, and audit logs.
- Supabase RLS scopes all client-visible data.
- Server routes and future Edge Functions handle Lodgify, Stripe, commission, and payout mutations.
- Vercel hosts the app.

## Trust Boundaries

- Browser: authenticated UI only, no Lodgify keys, no Stripe secrets.
- Next.js server/API routes: credentialed operations and validation.
- Supabase service role/Edge Functions: booking sync, commission writes, payout writes.
- Stripe/Lodgify: third-party APIs.

## Core Flow

1. Admin creates an affiliate.
2. Discoverly.ai generates a public customer code and exact Lodgify promotion name.
3. Admin manually creates that promotion in Lodgify.
4. Lodgify booking sync fetches booking detail.
5. Sync reads `booking.quote.room_type_items[].prices[]`.
6. Sync finds a `type === "Promotion"` row.
7. Sync matches `price.description.trim()` to `affiliate_promotions.lodgify_promotion_name`.
8. Only fully paid matched bookings create/update commissions.
9. Monthly payout batches group eligible unpaid commissions.
10. Admin manually approves and sends Stripe Connect transfers.

## Modules

- `src/lib/naming`: public code and Lodgify promotion name generation.
- `src/lib/commissions`: paid-booking checks, promotion matching, commission calculations.
- `src/lib/lodgify`: Lodgify fetch helpers and booking normalization.
- `src/lib/payouts`: payout window and grouping helpers.
- `src/lib/stripe`: Stripe Connect and transfer helpers.
- `src/lib/supabase`: server and service-role clients.

## MVP Constraints

- No cookie attribution.
- No custom checkout.
- No web scraping.
- No AWS, Azure, Firebase, or other extra infrastructure.
- Manual Lodgify promotion setup.
- Manual payout approval.
