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

Configure **Authentication → URL Configuration** with your local and production site URLs (still required for Supabase Auth, even though sign-in uses a typed code instead of a redirect link).

### Email templates (what Discoverly uses where)

Supabase decides **which template** to send based on the Auth API call—not from our Next.js code. Discoverly only triggers passwordless email via **`signInWithOtp`** (then **`verifyOtp`** in the app). There is **no password** flow in the UI right now, so **Reset password** is unused unless you add it later.

Use **Authentication → Emails → Templates** in the dashboard (the screen with Confirm sign up, Invite user, Magic link, etc.).

| Dashboard template | Used by Discoverly today? | When Supabase sends it |
| --- | --- | --- |
| **Magic link** | **Yes — required** | Every **“Email me a code”** / **Resend** from `/auth`. Same mailer for sign-in, company sign-up, and affiliate sign-up (`signInWithOtp`). Put the OTP in the body with `{{ .Token }}`. |
| **Confirm sign up** | Only if you enable it | Sent for **`signUp`** / “confirm email” style flows. Discoverly’s main UI uses OTP instead of `signUp`; this usually **does not** fire for normal users. Customize anyway if you turn **Confirm email** on under Email provider or use other clients that call `signUp`. |
| **Invite user** | Optional | Only when **you** invite someone from **Supabase Dashboard → Authentication → Users → Invite**. Not sent by Discoverly’s affiliate/company flows (those use in-app tokens). |
| **Reset password** | No (until you add passwords) | Only if you call `resetPasswordForEmail` or equivalent. Safe to leave default or simplify for later. |
| **Change email address** | Rare | When a user confirms a **new** email address on their account. |
| **Reauthentication** | Rare | Sensitive actions that require a step-up code (if you enable flows that use it). |

Official variables reference: [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

---

#### 1) Magic link — **paste this for Discoverly OTP** (required)

This is the one the app relies on. Without `{{ .Token }}` in the body, users cannot complete `/auth/verify`.

**Subject:**

```text
Your Discoverly sign-in code
```

**Body (HTML):**

```html
<h2>Your sign-in code</h2>
<p style="font-size: 24px; letter-spacing: 0.2em; font-weight: 600; margin: 16px 0;">{{ .Token }}</p>
<p>Enter this code in Discoverly. It expires soon.</p>
<p style="color: #666; font-size: 14px;">If you didn’t request this, you can ignore this email.</p>
```

Optional: you can omit any `{{ .ConfirmationURL }}` link so the email is code-only (matches the in-app flow).

---

#### 2) Confirm sign up — optional (only if that flow is on)

Use when users must confirm via email after **`signUp`** / confirmed signup policies.

**Subject:**

```text
Confirm your Discoverly account
```

**Body (HTML):**

```html
<h2>Confirm your email</h2>
<p>Use this code:</p>
<p style="font-size: 24px; letter-spacing: 0.2em; font-weight: 600;">{{ .Token }}</p>
<p>Or confirm by opening this link:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email</a></p>
```

If you only want a link, use `{{ .ConfirmationURL }}` alone; if you only want OTP, mirror the Magic link snippet.

---

#### 3) Invite user — optional (dashboard invites only)

**Subject:**

```text
You’re invited to Discoverly
```

**Body (HTML):**

```html
<h2>You’ve been invited</h2>
<p>You were invited to create an account on Discoverly.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
<p style="color: #666; font-size: 14px;">If you didn’t expect this, you can ignore this email.</p>
```

---

#### 4) Reset password — optional (future / unused by current UI)

**Subject:**

```text
Reset your Discoverly password
```

**Body (HTML):**

```html
<h2>Reset password</h2>
<p><a href="{{ .ConfirmationURL }}">Choose a new password</a></p>
<p style="color: #666; font-size: 14px;">If you didn’t request a reset, ignore this email.</p>
```

---

#### 5) Change email address — rare

**Subject:**

```text
Confirm your new email
```

**Body (HTML):**

```html
<h2>Verify your new email</h2>
<p><a href="{{ .ConfirmationURL }}">Confirm this change</a></p>
```

---

#### 6) Reauthentication — rare

Check the dashboard’s variable hints for this template (Supabase versions differ). If `{{ .Token }}` is available, use:

**Subject:**

```text
Your Discoverly verification code
```

**Body (HTML):**

```html
<h2>Verification code</h2>
<p style="font-size: 24px; letter-spacing: 0.2em; font-weight: 600;">{{ .Token }}</p>
<p>Enter this code to continue.</p>
```

---

### Provider settings (recommended)

1. **Authentication → Providers → Email** — enable Email.
2. For the simplest OTP-only story, disable **Confirm email** if you do not need the **Confirm sign up** template at all (OTP already proves inbox control).
3. **`email rate limit exceeded`** — Supabase’s **built-in** mail service enforces low per-project / per-user limits (easy to hit while testing **Resend code** repeatedly). Fix: **Authentication → Emails → SMTP Settings** → enable **custom SMTP** and fill **every** field (the dashboard warns until complete). After that, Auth emails use **your** provider’s quotas instead of Supabase’s shared pool.

#### SMTP setup (quick path with Resend)

1. Create a [Resend](https://resend.com/) account and **verify a domain** (DNS records they give you).
2. In Resend, create an **API key**, then use SMTP (Settings → SMTP): typical values are **Host** `smtp.resend.com`, **Port** `465` (SSL) or `587` (STARTTLS), **Username** `resend`, **Password** your API key.
3. **Sender email** must use your verified domain (e.g. `auth@yourdomain.com`). **Sender name** can be `Discoverly` or similar.
4. Paste those values into Supabase **SMTP Settings**, save, then send another OTP test.

Alternatives with SMTP: [SendGrid](https://sendgrid.com/), [Postmark](https://postmarkapp.com/), AWS SES—same idea: verified sender + SMTP host/port/user/password into Supabase.

**While debugging without SMTP:** wait out the cooldown (your UI uses ~45s between resends; Supabase may enforce **additional** per-hour caps), or use fewer test sends.

More detail: [Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## 3. Configure Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
INVITE_EMAIL_FROM=
OWNER_NOTIFICATION_EMAIL_FROM=
SECRET_ENCRYPTION_KEY=
STRIPE_SECRET_KEY_TEST=
STRIPE_SECRET_KEY_LIVE=
STRIPE_WEBHOOK_SECRET=
STRIPE_MODE=test
COMPANY_INVITE_TOKEN=
CRON_SECRET=
NEXT_PUBLIC_LODGIFY_PROMOTIONS_URL=https://app.lodgify.com
LODGIFY_PROMOTIONS_URL=https://app.lodgify.com
```

Stripe uses the platform account secret key. The app selects `STRIPE_SECRET_KEY_LIVE` only on Vercel production deployments, unless `STRIPE_MODE` is set. Use `STRIPE_MODE=test` locally and in previews; use `STRIPE_MODE=live` only when intentionally forcing live mode.

The webhook signing secret must match the Stripe endpoint for the same mode:

```text
Test webhook endpoint -> test whsec value -> STRIPE_MODE=test
Live webhook endpoint -> live whsec value -> STRIPE_MODE=live or Vercel production auto-live
```

Per-company Lodgify API keys are saved encrypted through the company settings UI. Do not use a shared Lodgify API key in env for production.

## 4. Start Local App

```bash
npm run dev
```

## 5. Company Onboarding

1. Create or use the seeded Zenful Cove company.
2. Save Lodgify API key.
3. Test connection.
4. Sync properties.
5. Open Stripe settings to confirm payout funding uses Stripe Checkout.
6. Create first affiliate.

## 6. Affiliate Setup

1. Create affiliate record.
2. Copy exact Lodgify promotion name.
3. Create matching promotion in Lodgify.
4. Mark Lodgify setup confirmed.
5. Send invite.
6. Affiliate accepts invite and connects Stripe.

## 7. Production Jobs

Vercel runs `/api/cron/lodgify-sync` hourly through `vercel.json`. Keep payout batch preparation and funding manually approved from the admin dashboard.
