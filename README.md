# Discoverly.ai

Discoverly.ai is an invite-only affiliate platform for direct short-term rental bookings. The MVP is built for Zenful Cove and uses Lodgify as the booking source of truth, Supabase for auth/data/RLS, Stripe Connect for affiliate payouts, and Vercel for hosting.

The core MVP rule is strict: a booking only counts as revenue driven, commissionable, payable, or included in dashboard totals when it is a fully paid Lodgify booking and has a matched affiliate promotion.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Row Level Security
- Supabase Edge Functions or scheduled functions for production sync jobs
- Stripe Connect
- Lodgify API
- Vercel

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SECRET_ENCRYPTION_KEY=         # openssl rand -base64 32
STRIPE_SECRET_KEY_TEST=        # Stripe Dashboard → Developers → API keys (Test mode)
STRIPE_SECRET_KEY_LIVE=        # Stripe Dashboard → Developers → API keys (Live mode)
STRIPE_CLIENT_ID_TEST=         # Stripe Dashboard → Connect → Settings (Test mode)
STRIPE_CLIENT_ID_LIVE=         # Stripe Dashboard → Connect → Settings (Live mode)
STRIPE_WEBHOOK_SECRET=         # signing secret of your active webhook endpoint
COMPANY_INVITE_TOKEN=          # openssl rand -base64 24
CRON_SECRET=                   # openssl rand -base64 32
```

Stripe mode is auto-selected: `live` only on Vercel production deploys, `test` everywhere else (preview + local). Set `STRIPE_MODE=test|live` to override.

Per-company Lodgify API keys are stored encrypted in the database, not in env vars. Do not expose Lodgify or Stripe secrets through `NEXT_PUBLIC_` variables.

## Development Commands

```bash
npm run dev
npm run typecheck
npm run build
```

## Database

Apply migrations from `supabase/migrations`. The initial migration creates the core schema, constraints, indexes, RLS policies, an affiliate-safe booking summary view, and a Zenful Cove seed company.

## Deployment Notes

- Deploy the Next.js app to Vercel. `vercel.json` registers an hourly cron at `/api/cron/lodgify-sync`; Vercel passes `CRON_SECRET` automatically as `Authorization: Bearer …`.
- Configure Supabase Auth redirect URLs for the deployed domain.
- Configure the Stripe webhook endpoint at `/api/stripe/webhook` and subscribe to: `account.updated`, `transfer.reversed`, `transfer.updated`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Keep payout processing manual-approved for the MVP.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Lodgify Attribution](docs/LODGIFY_ATTRIBUTION.md)
- [Naming Conventions](docs/NAMING_CONVENTIONS.md)
- [Payouts](docs/PAYOUTS.md)
- [Security](docs/SECURITY.md)
- [Setup](docs/SETUP.md)
