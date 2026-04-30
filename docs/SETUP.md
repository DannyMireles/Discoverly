# Setup

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Supabase

Create a Supabase project and apply:

```bash
supabase db push
```

or run the SQL in:

```text
supabase/migrations/0001_initial_schema.sql
```

Configure Supabase Auth redirect URLs for local and production domains.

## 3. Configure Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
LODGIFY_API_KEY=
```

For production, prefer per-company encrypted Lodgify key storage over a single `LODGIFY_API_KEY`.

## 4. Start Local App

```bash
npm run dev
```

## 5. Company Onboarding

1. Create or use the seeded Zenful Cove company.
2. Save Lodgify API key.
3. Test connection.
4. Sync properties.
5. Configure Stripe Connect.
6. Create first affiliate.

## 6. Affiliate Setup

1. Create affiliate record.
2. Copy exact Lodgify promotion name.
3. Create matching promotion in Lodgify.
4. Mark Lodgify setup confirmed.
5. Send invite.
6. Affiliate accepts invite and connects Stripe.

## 7. Production Jobs

Run Lodgify sync from a Supabase scheduled function hourly for the MVP. Keep payout execution manual-approved from the admin dashboard.
