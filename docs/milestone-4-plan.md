# Milestone 4 implementation and acceptance plan

Status: In progress

Branch: `feat/m04-checkout-payment-order`

Goal: a valid authenticated Product cart can be quoted, reserved, paid through
the Fake Payment Adapter, and converted exactly once into an immutable paid
Order without overselling or accepting forged, mismatched, stale, or replayed
callbacks.

Rules in scope: PRC-006–PRC-007, PRC-011–PRC-012, INV-002–INV-007,
INV-017–INV-018, CRT-002, CRT-004–CRT-010, CRT-012, CUS-002, CUS-004–CUS-005,
ORD-001–ORD-004, ORD-009, ORD-011–ORD-012, ORD-018, EVT-001–EVT-005,
EVT-009, PAY-001–PAY-003, SHP-001–SHP-008, HRD-001–HRD-006, and ADR-0004.

Milestone 4 completes the Product-cart path. Outfit-aware contracts retain the
atomic all-components invariant, while successful Outfit authoring and
purchase remain Milestone 5. A real payment provider, refunds, fulfillment,
returns, Redis, BullMQ, an external event bus, and production deployment are
outside this milestone.

## Acceptance criteria

### Shipping settings and quote

1. Shipping settings are append-only effective versions containing exactly the
   stable methods `iran_post`, `tipax`, and `tehran_local_courier`, each with an
   enabled flag and non-negative fixed IRR price, plus an optional non-negative
   free-shipping threshold and the immutable `order_subtotal` eligibility
   basis. Publishing a change creates a new version; it never rewrites a quote
   or Order snapshot.
2. An authenticated customer can request eligible shipping options only for
   their own active Cart and Address. Iran Post and Tipax follow their effective
   enabled settings. Tehran Local Courier is offered and accepted only when the
   selected server-owned address normalizes to Tehran.
3. The server computes Order Subtotal from current Product and Outfit prices.
   Equality with the configured threshold qualifies. Shipping, discount, tax,
   client-submitted amount, and client-submitted eligibility values cannot
   affect the decision.
4. Every option reports method code/name, eligibility, fixed quoted price or
   zero when free shipping applies, Order Subtotal, threshold decision, and
   settings version. Disabled or ineligible methods cannot be selected even if
   a request is forged.

### Checkout quote and reservation

1. Checkout requires an authenticated, unexpired, CSRF-valid customer session,
   an owned active Cart, an owned Address, a selected eligible shipping method,
   and an idempotency key. Empty carts and any `unavailable` or
   `requires_review` line are rejected before a reservation is attempted.
2. One command transaction locks the Cart and affected SKU inventory rows in a
   deterministic order, revalidates publication, current SKU price, requested
   quantity, and availability, computes the authoritative IRR quote, snapshots
   address/shipping/item inputs, and creates all SKU reservations atomically.
3. A successful CheckoutSession is active for exactly 30 minutes. Reservation
   increases `reservedQuantity` without changing `physicalQuantity`; available
   quantity remains derived as `physicalQuantity - reservedQuantity`.
4. If any requested SKU cannot be reserved, the whole command rolls back. No
   CheckoutSession, quote, reservation fragment, stock movement, or event is
   left behind. Inventory constraints and conditional writes make negative or
   over-reserved inventory impossible.
5. Cart prices are informational. A changed price is reflected in the new
   checkout quote and is never accepted from the browser. A created session
   retains its immutable quote; starting a later checkout reprices again.
6. Reusing an idempotency key with the same normalized command returns the same
   CheckoutSession without reserving twice. Reusing it with a different
   command fingerprint returns a conflict and changes no state.

### Reservation expiry and recovery jobs

1. Expiry is a conditional, idempotent transition from `active` to `expired`:
   all active reservations are released once, `reservedQuantity` decreases
   once, physical quantity is unchanged, Cart contents remain, and immutable
   release events are recorded.
2. A database-backed job record has a unique idempotency key, transactional
   lease, bounded attempts/backoff, and terminal failed state for operator
   review. Multiple workers or retries cannot release the same reservation
   twice.
3. Checkout/payment commands validate expiry using server time inside their
   own transaction. Safety never relies on scheduler timing: a delayed job may
   temporarily retain stock conservatively, but it cannot permit an expired
   hold to become a sale or permit overselling.
4. Recovery detects a session or attempt left in a retryable intermediate state
   after an external-provider response or process failure and reconciles it by
   provider verification plus the same idempotent callback command. It never
   invents payment success from local state.

### Payment attempt and Fake Payment Adapter

1. Payment application logic depends only on a provider-neutral port. Local and
   automated environments use the Fake Payment Adapter; production startup
   continues to fail closed when the fake adapter is selected.
2. Starting payment requires an owned, active, unexpired CheckoutSession and an
   idempotency key. The server sends the session's payable IRR amount and its
   own reference to the adapter; the client cannot supply either.
3. The Fake adapter exposes deterministic successful, failed, cancelled,
   pending, and tampered verification outcomes for acceptance testing through
   the same callback verification boundary. It does not model a real Iranian
   provider or weaken the callback contract.
4. Provider request/reference metadata is auditable and unique where required.
   Secrets and raw sensitive callback payloads are neither persisted nor
   logged; retained callback metadata is redacted and bounded.

### Callback, reconciliation, and exactly-once Order

1. A public callback is processed only after adapter-level authenticity and
   provider verification. Browser status, amount, currency, checkout ID, and
   transaction reference are untrusted inputs. The verified provider amount
   and `IRR` currency must exactly match the CheckoutSession snapshot.
2. Provider plus provider transaction ID is globally unique. A callback receipt
   records a payload fingerprint and result. Exact replay returns the prior
   commercial result; a conflicting reuse is rejected and records a security
   event without changing Checkout, inventory, or Order state.
3. In one database transaction, verified success with active reservations
   creates at most one commercial Order, assigns one immutable Order Number,
   writes immutable item/price/address/shipping/payment snapshots, consumes all
   reservations, atomically decreases physical and reserved quantities, writes
   Sale inventory movements and business events, marks Checkout paid, and
   retires the purchased Cart.
4. Unique constraints on CheckoutSession and PaymentAttempt enforce at most one
   Order even across parallel callbacks or transaction retries. Duplicate
   success returns the existing Order; it never repeats stock deduction,
   movements, revenue facts, or events.
5. Failed, cancelled, pending, forged, unverified, amount-mismatched, and
   currency-mismatched callbacks do not create an Order and do not consume or
   release an otherwise active reservation. A later verified success is
   evaluated from provider truth and current reservation state; no callback can
   downgrade an already paid result.
6. Verified success without an active, complete reservation enters
   `reconciliation`. It preserves the verified provider fact, creates no Order,
   does not deduct stock, and becomes visible to recovery/operations. The
   system never silently oversells to make local state match a payment.
7. A database failure after provider verification rolls back all commercial
   changes. Retrying the callback safely completes the same transition once.
   Domain/event publication outside the transaction occurs only after commit.

### Customer UI and API behavior

1. OpenAPI defines authoritative shipping-option, checkout-session,
   payment-attempt, payment-callback/result, owned Order read, admin shipping
   settings, idempotency, authorization, conflict, validation, and
   reconciliation contracts before consumer code.
2. Checkout shows owned address selection, only server-eligible shipping
   methods, current Product subtotal, shipping charge/free-shipping decision,
   final IRR-derived toman display, expiry, disabled/busy controls, price/stock
   conflicts, and actionable retry without treating Cart values as final.
3. Payment result renders pending, paid, failed/cancelled, expired,
   reconciliation, network error, and unknown/not-owned states. The paid state
   links to the immutable owned Order and displays the mixed-direction Order
   Number safely.
4. Production-build acceptance covers 390×844, 768×1024, 1280×800, and
   1440×900 with `lang="fa-IR"`, `dir="rtl"`, no horizontal overflow, visible
   focus, keyboard operation, meaningful status/alert regions, reduced motion,
   and no critical accessibility violation.

## Non-negotiable invariants

| ID     | Invariant                                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| M4-I01 | `0 <= reservedQuantity <= physicalQuantity`; available quantity is derived and never negative.                                   |
| M4-I02 | A CheckoutSession owns one immutable quote/address/shipping snapshot and expires 30 minutes after creation.                      |
| M4-I03 | All reservations for one checkout command commit or roll back together.                                                          |
| M4-I04 | One command owns one transaction; a provider network call is never hidden inside a long-held stock transaction.                  |
| M4-I05 | One successful CheckoutSession creates zero or one Order; only verified success may create it.                                   |
| M4-I06 | Reservation consumption, physical deduction, Order snapshots, and paid state commit atomically.                                  |
| M4-I07 | `(provider, providerTransactionId)` and command idempotency keys cannot cause duplicate effects.                                 |
| M4-I08 | Order Number, paid amount, items, prices, address, shipping choice/policy, and payment facts are immutable.                      |
| M4-I09 | Client values never authorize price, subtotal, shipping, currency, stock, customer ownership, callback result, or free shipping. |
| M4-I10 | An expired/released/incomplete reservation cannot become an Order; verified payment instead enters reconciliation.               |
| M4-I11 | Expiry/recovery jobs are leased and idempotent, but correctness is enforced synchronously in business commands.                  |
| M4-I12 | Business events are immutable; external/in-process publication happens only after the owning transaction commits.                |

## Failure scenarios

| Failure                                                           | Expected outcome                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Anonymous, revoked, expired, missing-CSRF customer                | `401`/`403`; no quote, hold, attempt, or ownership disclosure              |
| Foreign/unknown Cart, Address, CheckoutSession, or Order ID       | Same not-found response; no horizontal-authorization oracle                |
| Empty, unavailable, review-blocked, archived, or unpublished line | Checkout rejected before reservation; Cart remains actionable              |
| Price changes after Cart render                                   | Server quote uses current price; client amount is ignored                  |
| Last unit lost before lock                                        | Whole checkout returns conflict/unavailable; no partial hold               |
| Disabled method or Local Courier outside Tehran                   | Method omitted/rejected server-side; forged selection is ineffective       |
| Threshold just below/equal/above                                  | Only equality/above receives zero shipping against Product/Outfit subtotal |
| Shipping settings change after quote                              | Existing Checkout/Order retains prior version and policy values            |
| Payment start replay or key/payload collision                     | Same attempt returned or `409`; provider request is not duplicated         |
| Forged signature/unverified callback                              | Safe rejection plus redacted security event; no commercial mutation        |
| Client/provider amount or currency mismatch                       | Rejected/reconciliation security result; no Order or stock deduction       |
| Duplicate identical success callback                              | Existing paid result and Order Number returned; one deduction/event set    |
| Same transaction reference with different payload                 | Conflict/security event; original result remains authoritative             |
| Failure/cancel callback after success                             | Paid Checkout/Order remains unchanged                                      |
| Verified success after reservation expiry/release                 | Reconciliation; no Order, negative stock, or silent replacement hold       |
| Transaction failure during paid conversion                        | Full rollback; callback retry completes once                               |
| Expiry job crashes/retries or two workers claim                   | Lease/retry resumes; release transition occurs at most once                |
| Reconciliation provider unavailable                               | Bounded retry/backoff; visible pending/failed job, no invented success     |
| Result page refresh/back/duplicate navigation                     | Read-only state is stable; no new callback, attempt, or Order effect       |

## Adversarial concurrency and idempotency matrix

| Race / replay                                   | Synchronization point                                | Required assertion                                                                |
| ----------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Two customers reserve the last unit             | Inventory row lock + conditional quantity update     | Exactly one Checkout succeeds; physical=1, reserved=1, available=0                |
| Two checkouts reserve multiple overlapping SKUs | Deterministic ascending SKU lock order               | No deadlock leak or partial reservations; each aggregate is atomic                |
| Same checkout command submitted in parallel     | Unique customer/idempotency key + fingerprint        | One session and one reservation set; both callers resolve consistently            |
| Checkout vs price update                        | quote transaction locks/reads current projection     | Quote is one consistent committed price version; later checkout reprices          |
| Checkout vs inventory correction                | inventory transaction serialization                  | Constraint holds; either hold or correction wins without negative availability    |
| Expiry worker vs verified success               | conditional Checkout/reservation state transition    | Exactly one wins: paid Order and one deduction, or reconciliation and one release |
| Two expiry workers / job retry                  | lease compare-and-set + conditional release          | One release/event set; reserved quantity never decremented twice                  |
| Duplicate success callbacks in parallel         | unique provider transaction + Checkout-to-Order key  | Same one Order returned; one sale movement per reservation                        |
| Failed then successful out-of-order callback    | provider verification + monotonic paid state         | Active hold may become paid once; paid state cannot be downgraded                 |
| Successful then failed out-of-order callback    | existing paid-result read                            | Existing Order unchanged and returned/read consistently                           |
| Callback transaction crashes before commit      | database rollback                                    | No partial Order/stock; retry completes exactly once                              |
| Callback commits but response is lost           | replay receipt / unique constraints                  | Retry returns committed Order without duplicate effects                           |
| Expiry commits then verified callback arrives   | expired state is terminal for reservation            | Reconciliation only; zero Orders and no stock deduction                           |
| Job lease expires while first worker resumes    | lease owner/version compare-and-set                  | Stale worker cannot overwrite the new owner or duplicate transition               |
| Same transaction ID with altered amount/payload | unique receipt + fingerprint + amount reconciliation | Original fact preserved; altered replay rejected with no commercial effect        |

Every matrix case must assert Order count, reservation states, inventory
physical/reserved values, movement/event counts, callback receipts, and job
state in PostgreSQL—not only HTTP status.

## Migration and rollback plan

The contract migration will be additive: versioned shipping settings/methods,
CheckoutSession and immutable quote lines, SKU reservations, PaymentAttempt and
callback receipts, Order snapshots/items, database jobs/leases, reconciliation
records, supporting enums, unique keys, indexes, and inventory checks. No
existing Milestone 3 customer/cart/catalog row is rewritten destructively.

Development rollback may reverse the new migration only before dependent
checkout/payment/order facts exist. In an environment containing verified
payments or Orders, automatic down-migration is unsafe: retain the schema,
roll back application images, keep callback ingestion/reconciliation available,
and export/reconcile commercial facts before any approved data change.

## Verification evidence

Pending implementation. Final evidence must record commands and counts for all
quality gates, migration application, concurrency/idempotency assertions,
Playwright production-build outcomes and screenshots, independent Playwright
CLI inspection, rule coverage, security/operational changes, residual risks,
and rollback notes.
