# Scenario Coverage Matrix

Every behavioral scenario in `ROSEDENIM_Complete_Functional_Behavior_Reference.docx` has an automated test named `Scenario §N.M` in `apps/api/tests/scenarios/`. **87/87 covered.** Run with `npm test` (87 tests, isolated `prisma/test.db`, injectable clock for time-dependent rules).

Test file per category:

| Category | File | Scenarios |
|---|---|---|
| §3 Discovery | `s03-discovery.test.ts` | 6 |
| §4 Cart & Checkout | `s04-cart-checkout.test.ts` | 8 |
| §5 Payments | `s05-payment.test.ts` | 10 |
| §6 Inventory | `s06-inventory.test.ts` | 7 |
| §7 Delivery Zones & Addresses | `s07-address-zones.test.ts` | 6 |
| §8 Fulfillment | `s08-orders-fulfillment.test.ts` | 6 |
| §9 Multi-Channel | `s09-multichannel.test.ts` | 5 |
| §10 Human Handoff | `s10-human-handoff.test.ts` | 7 |
| §11 Admin Operations | `s11-admin-actions.test.ts` | 6 |
| §12 Messaging Failures | `s12-messaging-failures.test.ts` | 5 |
| §13 Outages | `s13-outages.test.ts` | 5 |
| §14 Security | `s14-security.test.ts` | 6 |
| §15 Cancel & Refund | `s15-cancel-refund.test.ts` | 5 |
| §16 Retention | `s16-retention.test.ts` | 5 |

---

## §3 Discovery: `s03-discovery.test.ts` · impl `services/catalog.ts`

| # | Behavior |
|---|---|
| §3.1 | Normal browse returns active products with live stock |
| §3.2 | All products sold out: catalog still renders, flagged sold out |
| §3.3 | Deactivated product disappears from next catalog load |
| §3.4 | Image URLs resolve; frontend falls back to placeholder |
| §3.5 | Direct link resolves a specific product by slug |
| §3.6 | Search with no results returns empty set |

## §4 Cart & Checkout: `s04-cart-checkout.test.ts` · impl `services/cart.ts`, `services/handoff.ts`

| # | Behavior |
|---|---|
| §4.1 | Add to cart, in stock |
| §4.2 | Add after item just sold out rejects (409 upstream) |
| §4.3 | Cart session expires after 30 min idle |
| §4.4 | Returning within 30 minutes restores cart exactly |
| §4.5 | Checkout sync reconciles to the server copy |
| §4.6 | Handoff with empty cart is blocked, no token generated |
| §4.7 | Successful handoff: token created, stock soft-reserved, 15-min TTL, WhatsApp redirect |
| §4.8 | Customer closes WhatsApp: token remains valid until TTL |

## §5 Payments: `s05-payment.test.ts` · impl `services/payments.ts`, `adapters/paystack.ts`

| # | Behavior |
|---|---|
| §5.1 | Successful card payment: order PAID, stock hard-deducted, confirmation sent |
| §5.2 | Successful MoMo payment: identical confirmation regardless of channel |
| §5.3 | Wrong MoMo PIN: one retry with fresh link, reservation retained |
| §5.4 | Insufficient funds: same retry handling as any failed charge |
| §5.5 | Second consecutive failure: no third auto-retry, human assistance offered |
| §5.6 | Payment after token expiry: money honored, order flagged for admin review |
| §5.7 | Duplicate webhook delivery is a no-op: exactly one confirmation |
| §5.8 | Customer pays twice: second payment flagged for refund, Kukua alerted |
| §5.9 | Owner-approved refund: Paystack refund issued, status refunded, customer notified |
| §5.10 | Bank transfer: same flow plus longer-settlement note |

## §6 Inventory: `s06-inventory.test.ts` · impl `services/inventory.ts`

| # | Behavior |
|---|---|
| §6.1 | Normal purchase: stock_quantity decremented by ordered quantity |
| §6.2 | Last unit reserved: other visitors immediately see Sold Out |
| §6.3 | Reservation expires unpaid: stock becomes available again |
| §6.4 | Race lost: later payer refunded with apology |
| §6.5 | Admin restock: realtime stock update pushed to the website |
| §6.6 | Manual adjustment: inventory_logs entry, no customer message |
| §6.7 | Low-stock threshold crossed: admin alert, customers see nothing |

## §7 Delivery Zones & Addresses: `s07-address-zones.test.ts` · impl `services/address.ts`, `services/bot.ts`

| # | Behavior |
|---|---|
| §7.1 | Known zone typed clearly: fee applied automatically |
| §7.2 | Location pin: matched to the nearest known zone |
| §7.3 | Address outside defined zones: manual quote + human handoff |
| §7.4 | Unrecognizable address: format re-prompt |
| §7.5 | Address change after payment: admin-only update + human handoff |
| §7.6 | Address change after shipping: rejected |

## §8 Fulfillment: `s08-orders-fulfillment.test.ts` · impl `services/orders.ts`

| # | Behavior |
|---|---|
| §8.1 | Pack → ship → deliver: customer messaged at every stage |
| §8.2 | Rider fails to deliver: order stays SHIPPED, bot follows up |
| §8.3 | Customer refuses delivery: cancelled + refund initiated + stock returned |
| §8.4 | Wrong item packed: silent PACKED → PAID revert |
| §8.5 | Rider reassigned mid-delivery: customer notified |
| §8.6 | Order stuck in PACKED 24+ hours: flagged, no automatic customer message |

## §9 Multi-Channel: `s09-multichannel.test.ts` · impl `services/handoff.ts`, `services/bot.ts`

| # | Behavior |
|---|---|
| §9.1 | Browses website, orders via token handoff: source tagged website |
| §9.2 | Direct WhatsApp chat end-to-end: source tagged whatsapp_direct |
| §9.3 | Returning customer: counters increment, repeat-buyer tag, personalized greeting |
| §9.4 | Abandoned website cart expires quietly while direct chat proceeds |
| §9.5 | Same customer, two devices: one continuous conversation thread |

## §10 Human Handoff: `s10-human-handoff.test.ts` · impl `services/bot.ts`

| # | Behavior |
|---|---|
| §10.1 | Explicit human request: immediate handoff |
| §10.2 | Three unrecognized messages: handoff on the third |
| §10.3 | Voice note: cannot parse, auto-handoff |
| §10.4 | High-value cart (≥ GHS 1,000): VIP alert, customer sees nothing different |
| §10.5 | Negotiation attempt: handed off, bot never negotiates |
| §10.6 | Staff takes over: bot goes silent |
| §10.7 | Staff releases: bot resumes automated handling |

## §11 Admin Operations: `s11-admin-actions.test.ts` · impl `routes/admin.ts`

| # | Behavior |
|---|---|
| §11.1 | Add a new product: visible on website and bot catalog immediately |
| §11.2 | Deactivate a product: hidden from catalog, past orders unaffected |
| §11.3 | Bulk stock update: each SKU gets its own log + realtime push |
| §11.4 | Edit zone fee: applies to new orders only |
| §11.5 | Export & analytics: CSV download and aggregated numbers |
| §11.6 | Staff account: scoped permissions (no staff management) |

## §12 Messaging Failures: `s12-messaging-failures.test.ts` · impl `services/messaging.ts`

| # | Behavior |
|---|---|
| §12.1 | Send fails transiently: retried, logged; order remains for manual follow-up |
| §12.2 | Customer blocked the business number: conversation flagged undeliverable |
| §12.3 | Customer returns from a new number: fresh conversation, no auto-magic |
| §12.4 | Outside 24h window: free-form rejected, falls back to pre-approved template |
| §12.5 | Webhook arrives late: processed on arrival, never a lost order |

## §13 Outages: `s13-outages.test.ts` · impl adapters + `sessionStore.ts`

| # | Behavior |
|---|---|
| §13.1 | Paystack down: no payment link, friendly message, no order fabricated |
| §13.2 | Platform-wide webhook delay: reservations persist, nothing lost |
| §13.3 | Meta outage: sends fail but the website stays fully browsable |
| §13.4 | Database unreachable: API errors out, never fabricates data |
| §13.5 | Cache layer down: sessions lost, orders/payments in the DB survive |

## §14 Security: `s14-security.test.ts` · impl `services/handoff.ts`, `routes/webhooks.ts`, `middleware/auth.ts`

| # | Behavior |
|---|---|
| §14.1 | Token spam: 6th request within an hour is rate-limited (429) |
| §14.2 | Guessed token: generic message, zero order data exposed |
| §14.3 | Forged webhook: rejected, logged, never mutates state |
| §14.4 | Admin login: JWT issued only for valid credentials |
| §14.5 | Duplicate order within 10 minutes: confirmation required |
| §14.6 | Malicious upload: rejected at validation, nothing stored |

## §15 Cancel & Refund: `s15-cancel-refund.test.ts` · impl `services/orders.ts`, `services/payments.ts`

| # | Behavior |
|---|---|
| §15.1 | Cancel before payment: reservation released, token invalidated |
| §15.2 | Cancel after payment: approval → refund issued, stock returned |
| §15.3 | Exchange request (wrong size): human handoff, no automated flow |
| §15.4 | Item damaged in transit: apology + immediate human handoff |
| §15.5 | Partial refund on a multi-item order: logged against the payment |

## §16 Retention: `s16-retention.test.ts` · impl `services/retention.ts`

| # | Behavior |
|---|---|
| §16.1 | 3-day check-in fires after delivery |
| §16.2 | 14-day cross-sell picks a related category |
| §16.3 | 60-day win-back with discount code |
| §16.4 | Reorder at day 45 resets the win-back timer |
| §16.5 | STOP opts out of marketing; transactional messages continue |

---

### Test infrastructure notes

- **Time control**: `clock.ts` exposes an injectable clock; tests advance time instead of sleeping (30-min carts, 15-min tokens, 24-h stale-packed, retention windows).
- **Simulators are the test doubles**: WhatsApp/Paystack simulators provide deterministic inbound events (`emitChargeSuccess`, `sim-inbound`) while exercising the exact webhook/adapter code paths used in production.
- **Isolation**: each suite runs against a fresh `prisma/test.db` (see `tests/globalSetup.ts`).
