# Payouts

Payouts are monthly and manually approved.

## Eligibility

Only fully paid, matched Lodgify bookings count. A booking with a public code or promotion amount is not enough. It must have a matched Lodgify `Promotion.description`.

## Commission Base

Default:

```text
commission_base = booking.subtotals.stay
commission = commission_base * affiliate_payout_value / 100
```

Default payout:

- Type: percent
- Value: 10
- Base: stay subtotal

Do not calculate commissions on taxes, VAT, cleaning fees, addons, unpaid bookings, canceled bookings, or deleted bookings.

## Schedule

The previous calendar month is paid by the 3rd of the next month.

Example: April commissions are reviewed and paid by May 3.

## Flow

1. System creates or displays the previous month payout batch.
2. Batch includes eligible unpaid commissions.
3. Admin reviews the batch and can hold any row that should not be paid yet.
4. Admin funds the approved batch through Stripe Checkout.
5. Stripe webhooks mark the batch as funded after the Checkout payment succeeds.
6. System sends Stripe Connect transfers to connected affiliate accounts.
7. Successful transfers mark payouts, payout items, and commissions as paid.
8. Failed transfers mark payouts failed and keep commissions available for retry.

## Statuses

Commission statuses:

- `pending`
- `eligible`
- `approved`
- `paid`
- `held`
- `canceled`
- `clawback_needed`

Payout batch statuses:

- `draft`
- `approved`
- `processing`
- `paid`
- `failed`
- `canceled`

## Stripe Connect

Affiliates must connect Stripe before they can receive payouts. They can share their code before connecting Stripe, but payouts remain paused until Stripe payouts are enabled.

Company Stripe onboarding is not required for the MVP. Discoverly collects payout funding through the platform Stripe account, then sends transfers to affiliates from the funded batch charge.

## Cancellations and Changes

- If a booking is canceled before payout, cancel the commission.
- If a booking is canceled or refunded after payout, mark the commission `clawback_needed`.
- If the booking total changes before payout, recalculate commission.
- If the booking total changes after payout, flag an adjustment or clawback.
