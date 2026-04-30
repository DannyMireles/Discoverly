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

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
LODGIFY_API_KEY=
```

Production should store Lodgify API keys in Supabase Vault or encrypted server-side storage. Do not expose Lodgify or Stripe secrets through `NEXT_PUBLIC_` variables.

## Development Commands

```bash
npm run dev
npm run typecheck
npm run build
```

## Database

Apply migrations from `supabase/migrations`. The initial migration creates the core schema, constraints, indexes, RLS policies, an affiliate-safe booking summary view, and a Zenful Cove seed company.

## Deployment Notes

- Deploy the Next.js app to Vercel.
- Configure Supabase Auth redirect URLs for the deployed domain.
- Configure Stripe webhook endpoint at `/api/stripe/webhook`.
- Run Lodgify sync from Supabase scheduled functions/cron in production.
- Keep payout processing manual-approved for the MVP.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Lodgify Attribution](docs/LODGIFY_ATTRIBUTION.md)
- [Naming Conventions](docs/NAMING_CONVENTIONS.md)
- [Payouts](docs/PAYOUTS.md)
- [Security](docs/SECURITY.md)
- [Setup](docs/SETUP.md)
