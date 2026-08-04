# Milestone 6 operations, fulfillment and returns plan

Date: 2026-08-04

Status: implementation acceptance baseline

Branch: `feat/m06-operations-fulfillment-returns`

## Scope and rule links

This milestone implements PRC-008–PRC-010, INV-008–INV-014, ORD-005–ORD-017,
RTE-001–RTE-005, EVT-001–EVT-012, CUS-002, CUS-005, CUS-008–CUS-009,
PAY-001–PAY-002 and the already-established immutable Order rules ORD-001–ORD-004
and ORD-018. It does not select or claim support for a production refund provider
(`OQ-002-PROD`).

Historical Order item, price, address, shipping, payment and provider facts remain
immutable. Mutable status fields are current projections reconstructed from
append-only transition, inventory, refund and business-event facts.

## Authorization and permissions

Authorization is enforced by server-side policies and never inferred from visible
navigation, submitted role names or UI state.

| Capability                                  | Super Admin | Inventory Admin | Instagram Admin           | Customer                 |
| ------------------------------------------- | ----------- | --------------- | ------------------------- | ------------------------ |
| Read/search all Orders and timelines        | Allow       | Allow           | Deny                      | Own Orders only          |
| Move Paid to Preparing                      | Allow       | Allow           | Deny                      | Deny                     |
| Add/edit tracking before delivery           | Allow       | Allow           | Deny                      | Read own only            |
| Move Preparing to Shipped                   | Allow       | Allow           | Deny                      | Deny                     |
| Confirm Shipped as Delivered                | Allow       | Allow           | Deny                      | Deny                     |
| Cancel Paid/Preparing Order                 | Allow       | Allow           | Deny                      | Deny                     |
| Submit eligible Website return              | Deny        | Deny            | Deny                      | Own delivered Order only |
| Approve/reject Website return               | Allow       | Allow           | Deny                      | Deny                     |
| Request/retry refund                        | Allow       | Allow           | Deny                      | Read own result only     |
| Individual/bulk price operations            | Allow       | Deny            | Deny                      | Deny                     |
| Production/manual/damaged inventory actions | Allow       | Allow           | Deny                      | Deny                     |
| Instagram sale/return inventory workflow    | Allow       | Deny            | Allow                     | Deny                     |
| Preview/apply bulk inventory operations     | Allow       | Allow           | Deny                      | Deny                     |
| Explore all audit/business events           | Allow       | Allow           | Own Instagram events only | Deny                     |

All high-impact commands require an idempotency key and an audit reason. Bulk
apply additionally requires a persisted, unexpired preview and the exact preview
version.

## Fulfillment transition acceptance

The conservative version-1 state graph is:

```text
Paid -> Preparing -> Shipped -> Delivered -> Returned (only when all fulfilled quantity is returned)
  └-----------> Cancelled
        └-----> Cancelled
```

Cancellation after shipment is rejected; operations must complete shipment and
use the return workflow. `Cancelled` and `Returned` are terminal. A partial
approved return does not change a Delivered Order to Returned.

| Transition                  | Required conditions                                                            | Atomic effects                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Paid -> Preparing           | authorized actor; matching expected version                                    | append transition and Business Event; update projection                                                                                       |
| Paid/Preparing -> Cancelled | authorized actor; reason; no completed cancellation; provider refund confirmed | append cancellation/refund facts; restore sold SKU quantities through Inventory movements once; update projection after provider confirmation |
| Preparing -> Shipped        | authorized actor; carrier and tracking reference present                       | append Shipment and transition facts; update projection                                                                                       |
| Shipped -> Delivered        | authorized actor; Shipment exists; server delivery timestamp                   | append delivery confirmation and transition facts; expose return deadline                                                                     |
| Delivered -> Returned       | all fulfilled quantities have approved returns and confirmed refund outcomes   | append transition; never rewrite Order items or totals                                                                                        |

Tracking updates append immutable Shipment tracking revisions. The latest
revision is the current projection. A customer sees only tracking data belonging
to their Order.

## Return and refund acceptance

- Eligibility uses server time and the recorded delivery-confirmation timestamp.
- A request at exactly `deliveredAt + 24 hours` is eligible; one millisecond later
  is rejected.
- Every requested item belongs to the customer's Order and quantity is positive.
- Requested quantity cannot exceed fulfilled quantity minus quantities in
  submitted/approved/completed requests. Duplicate or replayed commands return
  the original request only when the request hash matches.
- `unused`, `unwashed` and `tagsAttached` must all be literal `true`.
- Submission appends facts only. It never restores stock or claims a refund.
- An authorized decision moves Submitted to Approved or Rejected exactly once.
- Approval restores the exact component SKU quantities through
  `CUSTOMER_RETURN` Inventory movements. Outfit returns restore component SKUs,
  never synthetic Outfit stock.
- Refunds use a provider-neutral port. `confirmed` is recorded only from an
  authenticated provider result. A pending/failed result remains retryable and
  cannot be presented as refunded.
- A retry uses the same immutable Refund record and provider idempotency key;
  confirmed refunds cannot be repeated or reduced.

## Inventory, Instagram and bulk-operation acceptance

- All inventory changes use a named Inventory action and append before/after
  physical and reserved quantities, actor, reason, correlation and idempotency.
- Instagram sale decreases physical quantity; Instagram return increases it
  through its dedicated authorized workflow. Neither can make stock negative or
  below reserved quantity.
- A bulk preview validates filter criteria, selected SKU identities, operation,
  amount/percentage, integer-IRR rounding, resulting non-negative stock and
  positive prices without changing data.
- The persisted preview records target IDs, before values, proposed values and
  optimistic versions. Apply cannot target anything outside that preview.
- Stale or independently invalid targets are reported per item. Valid items may
  succeed while the operation ends `partial_failed`; every result is auditable.
- A repeated apply returns the stored result and never applies a delta twice.
- Concurrent inventory updates lock SKU projections in stable ID order and
  preserve `0 <= reserved <= physical`.

## Audit exploration acceptance

Authorized queries support bounded pagination and filters for date range, event
type, actor, entity type and entity identifier plus safe text search over indexed
event metadata. Results are chronological, immutable and exclude secrets, OTPs,
session values, full addresses and raw provider payloads.

## Illegal transitions and failure cases

Every case below is rejected without partial commercial, inventory or financial
effects and with a stable problem code:

- Paid -> Shipped or Delivered; Preparing -> Delivered; Shipped -> Preparing;
- any transition out of Cancelled or Returned;
- cancellation after Shipped/Delivered or customer cancellation;
- shipment without tracking data and delivery without a Shipment;
- return before delivery, after the inclusive 24-hour boundary, with a false or
  missing declaration, for another customer's Order, unknown item or excessive
  quantity;
- approval/rejection by the wrong role, repeated conflicting decisions, or a
  refund amount above the approved immutable line totals;
- refund retry after confirmation, provider response mismatch, provider failure
  presented as success, or reuse of an idempotency key with a different request;
- Instagram-only role using production/manual/damaged actions;
- bulk apply without preview, against an expired or stale preview, with changed
  filters/operation, zero targets, unsafe arithmetic or an unauthorized role;
- concurrent adjustments that would make stock negative/below reserved quantity;
- audit access by customers or unauthorized administrators and Order access by a
  non-owner.

## Required evidence

Domain tests cover every allowed and forbidden state transition and exact clock
boundaries. PostgreSQL integration tests cover ownership/roles, idempotency,
refund retries, immutable facts, concurrent stock changes and partial bulk
failure. Contract tests cover all new request/response/problem shapes. Production
Playwright acceptance covers staff fulfillment/return/refund, customer Order and
return journeys, RTL, keyboard/accessibility, mixed-direction identifiers, all
four required viewports and loading/empty/error/disabled/unavailable/success
states. Deterministic screenshots are written under
`output/playwright/milestone-6/`.
