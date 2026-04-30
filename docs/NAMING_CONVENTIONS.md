# Naming Conventions

Every affiliate promotion has two names:

- Public customer-facing code
- Internal Lodgify promotion name/description

## Public Code

Example:

```text
JANE10
```

This is what guests see and use.

## Lodgify Promotion Name

Format:

```text
AFF_{COMPANY}_{AFFILIATE}_{GUESTDISCOUNT}_{PAYOUT}_{SHORTID}
```

Zenful Cove example:

```text
AFF_ZENCOVE_JANE_10PCT_10PCT_A82K
```

Meaning:

- `AFF`: affiliate promotion marker
- `ZENCOVE`: company slug
- `JANE`: affiliate slug
- `10PCT`: guest discount
- `10PCT`: affiliate payout
- `A82K`: unique short ID

## Examples

```text
AFF_ZENCOVE_JANE_10PCT_10PCT_A82K
AFF_ZENCOVE_JOHN_10PCT_10PCT_F19Q
AFF_ZENCOVE_MARIA_25USD_10PCT_P72M
AFF_ZENCOVE_ALEX_10PCT_50USD_K91Z
```

## Tokens

Discount token examples:

- `10PCT`
- `25USD`

Payout token examples:

- `10PCT`
- `50USD`

## Unique Suffix

The short suffix prevents collisions when affiliates share names or have identical discount/payout terms. The Lodgify promotion name should not be changed after bookings have been attributed to it without an advanced admin confirmation flow.
