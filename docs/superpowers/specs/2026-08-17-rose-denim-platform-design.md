# ROSE & DENIM BY KUKUA — WhatsApp-Hybrid E-Commerce Platform — Design Spec

**Date:** 2026-08-17
**Status:** Approved
**Source documents:** `ROSEDENIM_Complete_Functional_Behavior_Reference.docx` (87 behavioral scenarios), `figma.ui/ux.md` (design system)

## 1. Goal

Build the complete live system described in the Functional Behavior Reference: a fashion e-commerce platform for Accra, Ghana where customers browse a website and complete orders via WhatsApp handoff, plus a direct-WhatsApp bot ordering flow, with a full admin dashboard for Kukua. Every one of the 87 documented scenarios must be implemented and test-traceable.

## 2. Run Mode

Simulator-first, real-ready. Every external dependency sits behind an adapter interface with two implementations:

| Service | Real adapter | Simulator (default) |
|---|---|---|
| Payments | Paystack REST API | In-process Paystack simulator (link creation + webhook emission) |
| WhatsApp | Meta Cloud API | Console/inbox simulator that records sends and accepts injected inbound messages |
| Images | Cloudinary URLs | Static placeholder image service |
| Database | Postgres/Supabase | SQLite via Prisma (same schema) |
| Session cache | Redis (`REDIS_URL`) | In-memory TTL KV store (same interface) |

Switching to real services is env-var-only; no code changes.

## 3. Repository Layout (npm workspaces monorepo)

```
rose-and-denim/
├── apps/
│   ├── api/        # Express + TypeScript backend
│   ├── web/        # Next.js 15 storefront (App Router, Tailwind)
│   └── admin/      # Next.js 15 admin dashboard (App Router, Tailwind)
├── packages/shared # Shared TS types, enums, helpers
├── wiki/           # Complete repo wiki (GitHub-wiki format)
├── docs/superpowers/specs/
└── root: package.json, tsconfig.base.json, .env.example, README.md
```

## 4. Data Model (Prisma)

Tables (Postgres-compatible, SQLite locally):

- `categories`, `products`, `product_variants` (size/color, `stock_quantity`, `reserved_stock`, `low_stock_threshold`)
- `customers` (phone unique, `total_orders`, `total_spent`, tags incl. `repeat_buyer`/`vip`, `marketing_opt_out`)
- `orders` (`status`: RESERVED|PAID|PACKED|SHIPPED|DELIVERED|CANCELLED|REFUNDED, `source`: website|whatsapp_direct, delivery fee snapshot, rider_name/phone, vip flag, `delivered_at`)
- `order_items` (price snapshot)
- `payments` (`paystack_reference` unique — idempotency key, amount, channel, status)
- `order_tokens` (code, phone, cart snapshot, 15-min `expires_at`, status)
- `webhook_events` (provider+event idempotency ledger)
- `delivery_zones` (name, city, fee, aliases)
- `conversations` (`status`: BOT|NEEDS_HUMAN|HUMAN, `fail_count`)
- `messages` (direction, kind: text|voice|location|image, body)
- `inventory_logs` (`change_type`: purchase|reserve|release|restock|adjustment)
- `admin_users` (`role`: owner|staff, bcrypt password hash)
- `retention_state` (per-order checkin/crosssell sent flags, per-customer win-back timer)

Rules: money stored as integer pesewas; all timestamps UTC; prices snapshotted onto order items at order creation.

## 5. Backend Architecture (apps/api)

Layered: `routes/` (HTTP) → `services/` (business logic, pure functions over prisma + session store) → adapters (`paystack/`, `whatsapp/`, `images/`, `sessionStore`). Deterministic clock injection (`setNow`) in tests for all TTL logic.

### Engines & scenario coverage

| Engine | Responsibilities | Doc § |
|---|---|---|
| CatalogService | active products w/ live stock (`available = stock - reserved`), sold-out flags, search, deactivation | 3, 6, 11 |
| CartService | session carts (30-min TTL), add validates live stock → 409 race, multi-tab server reconciliation at checkout | 4 |
| HandoffService | token creation (15-min TTL, soft reserve `reserved_stock++`), WhatsApp deep-link build, rate limit 5 tokens/hr/phone → 429, duplicate-order detection (same phone+items <10 min → confirm), token invalidation on cancel | 4, 14, 15 |
| PaymentService | init payment link, webhook HMAC-SHA512 verification, idempotent charge.success (payments.paystack_reference unique), expired-token late payment → manual-review order + confirmation, double payment → refund flag + owner alert, refunds via adapter | 5, 14 |
| OrderService | status machine w/ allowed transitions (incl. revert PACKED→PAID), customer template message per transition, rider reassignment, stale-packed (>24h) dashboard flag, cancel/refund flows with stock release | 8, 15 |
| AddressService | zone matching by text (aliases + regex), location-pin reverse match to nearest zone, unrecognized → re-prompt, out-of-zone → manual quote + handoff; post-payment address changes require admin | 7 |
| WhatsAppBotEngine | menu-driven direct-chat ordering (catalog browse → add → address → payment link), intents: cancel, STOP, human/agent/manager keywords, negotiation detection, voice-note handoff, 3-consecutive-failures handoff, VIP alert > GHS 1000, take-over/release semantics | 9, 10 |
| MessagingAdapter | send w/ retry policy (max attempts), failure logging, undeliverable flag on repeated failure, template fallback when outside 24h window, blocked-number handling | 12 |
| RetentionScheduler | daily tick: 3-day check-in, 14-day cross-sell, 60-day win-back w/ timer reset on new order, STOP opt-out honored (transactional continues) | 16 |
| RealtimeHub | `ws` WebSocket server: `stock.updated` → web clients; `order.new`, `inbox.alert`, `alert.low_stock`, `alert.stale_packed` → admin | 6, 11 |
| AuthService | JWT login, owner vs staff scoping (staff: orders/inventory/chat only) | 11, 14 |
| ExportsService | CSV/JSON sales reports for a period | 11 |

### Key behaviors (exact, from spec)

- Cart session TTL 30 min idle; order token TTL 15 min; token expiry releases `reserved_stock`.
- Payment success on an expired/released token: money honored → order created `needs_admin_review`, customer still confirmed.
- Duplicate webhook = no-op via `webhook_events` + unique payment reference.
- Second payment on a PAID order: no duplicate order; extra payment flagged `refund_due`, owner notified.
- Failed charge: reservation retained for exactly one retry; after 2nd failure → human-assistance offer.
- Unverified webhook signature → reject + security log; never mutates state.
- Race: both channel orders for last unit — first payer hard-deducts; later payer refunded with apology message.
- Uploads: images only, ≤5MB, type-checked (validation implemented; storage adapter).

## 6. Frontends

### apps/web (storefront)
Design per `figma.ui/ux.md`: palette indigo `#2C3E66` / rose `#C97B84` / off-white `#FAF7F5` / charcoal `#2B2B2B` / sand `#D9A679`; Fraunces serif headlines + Inter body; asymmetric editorial layouts; WhatsApp green reserved for the single "Complete Order on WhatsApp" CTA.

Pages/components: Home (asymmetric hero, category strip with flagship Jeans card, irregular New In), Category grid (broken grid, sand "Only N left" labels), Product detail (swatch selectors, crossed-out unavailable sizes), slide-out mini-cart, handoff transition screen ("Opening WhatsApp…" bubble style), search with empty-state shortcuts, image placeholder fallback, sold-out badges, mobile-first nav.

Client behavior: local cart mirrored to server session; on "Complete Order" → POST handoff → token + WhatsApp deep link redirect; disabled CTA on empty cart; 409 handling shows "just sold out" + similar items.

### apps/admin (dashboard)
Login (split-screen), Orders list (source filter tabs, restrained status pills, inline Mark Packed/Shipped, "X new orders" sand indicator, stale-packed flag), Order detail (vertical timeline, customer/items/payment, embedded conversation thread), Inventory (inline stock edit, low-stock flags, add product, bulk restock), Inbox (conversation list w/ bot/human dots, chat thread, Take Over / Release to Bot), Analytics (hierarchical metrics, channel split-bar), Customers/CRM (tags, order history), Exports, Settings (zones, staff accounts — owner only).

Admin receives WebSocket alerts; polls as fallback.

## 7. Security

JWT admin auth (bcrypt hashes); Paystack HMAC-SHA512 webhook verification; Meta webhook verify-token handshake; rate limiting (token requests 5/hr/phone; admin login attempts); token lookup failure exposes nothing; image upload validation; staff permission scoping. 2FA + automated exchanges + malicious-upload storage defense logged as roadmap.

## 8. Testing Strategy

Vitest in `apps/api`. Scenario suites in `tests/scenarios/` mirroring doc sections 3–16, each test annotated `Scenario §N.M`. Deterministic time via injectable clock. Simulator adapters used directly (e.g., emit `charge.success` events). Target: all 87 scenarios covered; wiki carries the master traceability matrix (scenario → service file → test file).

## 9. Wiki Deliverables

`wiki/Home.md` plus: Architecture, Getting-Started, Data-Model, API-Reference, Webhook-Security, Bot-Behavior-Matrix, Order-Lifecycle, Inventory-and-Reservations, Retention-Automation, Admin-Permissions, Deployment, Env-Configuration, Scenario-Coverage-Matrix, Troubleshooting, Roadmap.

## 10. Out of Scope (per doc, documented as roadmap)

2FA device verification, automated exchange flow, real geocoding provider, multi-currency, non-Ghana delivery automation.

## 11. Assumptions

- Seed data: 5 categories, ~12 products with variants, Accra delivery zones (East Legon GHS 25, etc.), owner admin account (env-configurable).
- Currency GHS, integer pesewas internally, formatted display.
- Retention scheduler runs on an interval timer in-process (cron-ready design).
