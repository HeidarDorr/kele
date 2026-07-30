# ADR-0004: Checkout and payment precede Order creation

Status: Accepted
Date: 2026-07-24
Amends: ORD-001 and clarifies ORD-009

## Context

ORD-001 says an Order exists only after successful payment, while ORD-009
lists `Pending Payment` as an order status. Creating provisional Orders can
pollute commercial history and conflicts with the definition of Order as a
completed purchase transaction.

Inventory must still be reserved before the customer leaves for payment, and
payment retries/callbacks must be tracked.

## Decision

Use separate pre-order entities:

```text
Cart
  -> CheckoutSession
       -> InventoryReservation(s)
       -> PaymentAttempt(s)
            -> verified success
                 -> Order
```

- Entering checkout revalidates catalog state, price, shipping, and inventory.
- A CheckoutSession snapshots the quoted commercial inputs and expires after
  30 minutes.
- Inventory reservations are created atomically with the active session.
- PaymentAttempt records provider request/reference/status without becoming an
  Order.
- A verified successful callback creates exactly one Order, converts
  reservations to stock deductions, and records immutable snapshots in one
  transaction.
- Callback processing is idempotent by provider and provider transaction ID.
- Duplicate success callbacks return the existing result.
- Failed or abandoned payment attempts do not create Orders.
- Expiry releases reservations but preserves audit/payment attempt history.

`Pending Payment` is removed from the commercial Order lifecycle. It is a
PaymentAttempt/CheckoutSession status. Order fulfillment statuses begin at
`Paid` and progress through preparation, shipment, delivery, cancellation, or
return as allowed by a state machine.

## Failure handling

- A success callback without an active reservation enters a reconciliation
  state and alerts operations; it must not silently oversell.
- Provider verification failure records a security event and changes no
  commercial state.
- Transaction failure after a verified callback is safely retryable.
- Refunds, cancellations, and returns use explicit idempotent workflows and
  immutable financial records.

## Consequences

- Order history reflects paid commercial transactions.
- Payment operations have their own auditable lifecycle.
- Reporting distinguishes checkout abandonment from orders.
- API and persistence need explicit CheckoutSession and PaymentAttempt models.
