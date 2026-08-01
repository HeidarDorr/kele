# Milestone 3 implementation and acceptance plan

Status: In progress

Branch: `feat/m03-identity-customer-cart`

Rules in scope: CUS-001–CUS-005, CUS-008, CUS-010, CRT-001–CRT-004,
CRT-007–CRT-018, INV-001–INV-004, INV-017, PRC-001, PRC-006–PRC-007,
PRC-011–PRC-012, SMS-001–SMS-002, LOC-001–LOC-002, HRD-001–HRD-002.

Rules deliberately not claimed in this milestone: CUS-006–CUS-007 (stock
notifications), CUS-009 (account deletion workflow), checkout/reservation
effects in CRT-005–CRT-006 and CRT-009, and successful Outfit authoring or
purchase, which remains Milestone 5. The cart representation and merge policy
remain Outfit-Revision aware before that module is delivered.

## Acceptance criteria

### Identity and session

1. Requesting an OTP with a normalized Iranian mobile creates a short-lived
   challenge, sends it through the provider-neutral Fake SMS adapter in local
   and test environments, and returns the same generic response whether or not
   the customer already exists. The persisted record contains a salted
   verifier, never the OTP value.
2. Challenge creation is limited independently by normalized mobile, a
   privacy-preserving IP risk hash, and a signed device identifier. Resend
   cooldown and rolling limits return a generic `429` problem without sending
   another message.
3. Verification accepts one correct, unexpired code once. Wrong codes consume
   the bounded attempt budget; expired, consumed, replayed, or exhausted
   challenges cannot authenticate.
4. Successful verification creates or finds the customer, revokes any session
   presented by the browser, creates a new high-entropy opaque session token,
   stores only its verifier, and sends a `Secure` cookie in production plus
   `HttpOnly`, `SameSite=Lax`, bounded idle/absolute expiry in every environment.
5. Cookie-authenticated mutations require a matching anti-CSRF token. Logout
   revokes server state, clears the session cookie, and the old token remains
   unusable.
6. Authentication merges a valid Guest Cart exactly once and returns the
   merge result in the same response. Repeating or racing the merge does not
   duplicate quantities or notices.

### Customer and address ownership

1. An authenticated customer can read and update only their own first/last
   name; the verified mobile number is not client-editable.
2. An authenticated customer can list, create, update, and delete only their
   own addresses. Repository predicates include both address and customer IDs;
   using another customer's opaque address ID produces the same not-found
   response as an unknown ID.
3. Setting an address as default clears the previous default atomically. A
   customer has at most one default address, while deleting it does not invent
   a replacement.
4. Anonymous, expired-session, revoked-session, and CSRF-invalid requests
   cannot mutate profile or address data.

### Anonymous and authenticated cart

1. A catalog visitor can obtain an anonymous cart backed by a high-entropy,
   authenticated cookie, add a published Product SKU, change quantity, remove
   a line, and clear the cart without creating a reservation (CRT-002/INV-003).
2. An authenticated customer has at most one active server cart. Cart identity
   is taken only from validated cookies/session ownership, never a client
   customer ID or cart ID.
3. Each mutation supplies the observed cart version. A row lock plus optimistic
   version check makes concurrent writes deterministic: one conflicting writer
   receives `409` and no partial line change remains.
4. Every cart response re-reads the current published Product/SKU state,
   current price projection, and `physical - reserved` inventory. Informational
   totals use integer IRR; the UI uses the central exact toman formatter.
5. Adding to cart never promises or reserves stock. A zero-stock or archived
   SKU remains represented as `unavailable`; all non-available states set
   `checkoutBlocking=true`. No checkout endpoint or UI is implemented here.
6. Loading, empty, success, validation error, stale-version conflict,
   unavailable, requires-review, and network error states have explicit Persian
   UI treatment on the drawer/page.

### Deterministic Guest Cart merge (CRT-013–CRT-018)

1. Guest-only lines are copied in stable source order to the customer cart.
2. Matching Product SKU quantities are combined once. When positive current
   inventory is lower than the combined quantity, the result is capped to that
   inventory and a `quantity_reduced_to_inventory` notice is persisted and
   returned.
3. At zero current inventory the line remains with its requested quantity and
   `unavailable` status, with an `sku_unavailable` notice. Retaining a non-zero
   requested quantity is the representation that satisfies CRT-017 while a
   cart-line quantity remains a positive request, not a reservation.
4. Outfit lines are never matched to a newer revision. A referenced revision
   that the Outfit application contract reports as no longer purchasable keeps
   its exact revision ID, enters `requires_review`, produces a notice, and
   blocks checkout.
5. CRT-015 combines only matching Product SKUs. Two Outfit lines that reference
   the same revision and size remain distinct source lines; no unapproved Outfit
   quantity-combination rule is inferred.
6. Merge is transactional: customer cart updates, notices, Guest Cart terminal
   state, merge receipt, and cookie retirement either all commit or all roll
   back.

### Browser acceptance

1. Production builds cover catalog-to-cart, anonymous persistence, OTP sign-in
   and merge, logout, profile update, address CRUD, cart quantity/remove/clear,
   and protected-route behavior.
2. The cart drawer, cart page, sign-in, profile, and address pages render with
   `lang="fa-IR"`, `dir="rtl"`, logical layout properties, readable isolated
   mobile/SKU values, visible focus, semantic labels/status messages, and full
   keyboard operation.
3. Deterministic evidence is captured at 390×844, 768×1024, 1280×800, and
   1440×900 with animations disabled, no horizontal overflow, and no critical
   accessibility error.

## Abuse cases and negative security tests

- Enumerate existing customers through OTP responses or timing differences.
- Flood resend by changing only mobile, IP, or device; brute-force beyond the
  failure budget; replay a consumed/expired challenge.
- Fixate a pre-auth session across login, steal/reuse a revoked token, or use a
  session after idle/absolute expiry or logout.
- Submit state changes without/with a mismatched CSRF token.
- Read or mutate another customer's profile, address, authenticated cart, or
  anonymous cart by substituting opaque identifiers or forged cookie payloads.
- Smuggle unknown input properties, a customer ID, price, availability,
  checkout-blocking status, or ownership decision from the client.
- Race two quantity updates at the same cart version, race login/merge, replay
  the same Guest Cart, or mutate a Guest Cart after merge.
- Inflate quantity above the request limit or current inventory; change price,
  publication state, or inventory between add/read/merge.
- Replace an old Outfit Revision during merge or clear its review blocker
  without an explicit customer resolution flow.

## Failure scenarios and expected outcomes

| Failure                                      | Expected outcome                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| SMS adapter rejects dispatch                 | Challenge is not usable; generic dependency problem, no raw code in logs     |
| Invalid Iranian mobile or unknown fields     | `400` validation problem; no challenge or SMS                                |
| OTP cooldown/limit                           | `429` with safe retry metadata; no account-state disclosure                  |
| Wrong/expired/replayed OTP                   | Generic verification failure; no customer/session/cart mutation              |
| Database failure during authentication/merge | No partial customer cart or merge receipt; no authenticated cookie           |
| Invalid/forged anonymous-cart cookie         | It is ignored and replaced by a fresh anonymous cart on safe cart read       |
| Missing, revoked, or expired session         | `401`; protected resource is not disclosed                                   |
| Foreign or unknown address ID                | Identical `404`; no horizontal-authorization oracle                          |
| Stale cart version                           | `409`; caller reloads current cart; no partial mutation                      |
| Product/SKU archived or inventory zero       | Line remains unavailable and blocks checkout                                 |
| Price changes after add                      | Next cart read shows current informational price and recomputed total        |
| Outfit revision unavailable                  | Exact revision remains `requires_review`; no automatic substitution          |
| Browser/API network failure                  | User input remains where safe and an actionable Persian retry state is shown |

## Migration and rollback note

Milestone 3 adds identity, customer, address, session, cart, cart-line, notice,
and merge-receipt tables plus supporting enums, indexes, checks, and ownership
constraints. The development rollback is the reverse migration before any
dependent Milestone 4 data exists. In an environment containing customer data,
rollback requires an export/retention decision and is not treated as a safe
automatic operation.
