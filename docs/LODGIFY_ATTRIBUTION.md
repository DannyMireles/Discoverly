# Lodgify Attribution

Lodgify does not return the public customer promo code directly in the booking detail payload. Discoverly.ai attributes bookings from the promotion rows inside:

```text
booking.quote.room_type_items[].prices[]
```

Rows can include a promotion item:

```json
{
  "type": "Promotion",
  "amount": -25,
  "description": "AFF_ZENCOVE_JANE_10PCT_10PCT_A82K"
}
```

The `description` field is the attribution key.

## Match Rule

Discoverly.ai finds price items where:

```ts
price.type === "Promotion"
```

Then it matches:

```ts
price.description.trim()
```

to:

```text
affiliate_promotions.lodgify_promotion_name
```

Discount amount is never used for attribution. Multiple affiliates can have the same 10% discount, so the promotion description must be the unique source of truth.

## Fully Paid Rule

A booking is commissionable only when:

- `booking.status === "Booked"`
- `booking.is_deleted === false`
- `booking.canceled_at` is null
- `booking.amount_paid >= booking.total_amount`
- at least one transaction has `type === "Payment"` and `status === "Done"`

If any condition fails, the booking is not counted as revenue driven, not commissionable, and not payable.

## Exact Lodgify Name

The admin must create the Lodgify promotion with the exact Discoverly.ai generated name. If Lodgify has a typo such as:

```text
AFF_ZENCOVE_JAEN_10PCT_10PCT_A82K
```

Discoverly.ai will show it as an unmatched promotion.

## Unmatched Promotions

Unmatched promotions are visible to company admins. Admins can map them to an affiliate promotion, ignore them, or mark them reviewed.

## Multiple Promotions

The MVP uses the first matched affiliate promotion row found in the Lodgify booking detail. If multiple promotion rows exist and none match an affiliate promotion, the booking is unmatched. If future Lodgify data shows legitimate multiple affiliate promotions on one booking, handle that as an explicit product rule before paying commissions.
