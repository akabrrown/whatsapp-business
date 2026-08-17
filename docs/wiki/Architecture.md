# Architecture

## System overview

```
            ┌──────────────┐        ┌─────────────────────────────────────┐
  shopper ─▶│  apps/web    │  REST  │              apps/api               │
            │  storefront  │───────▶│  storefront routes  · cart · handoff │
            └──────────────┘        │  admin routes (JWT) · webhooks        │
                                    │  bot engine · retention scheduler     │
  WhatsApp ◀───────────────────────▶│  adapters: whatsapp / paystack / img  │
  (Cloud API or simulator)          │  realtime hub (WebSocket /ws)         │
            ┌──────────────┐  REST  │  Prisma + SQLite · session store      │
  owner   ─▶│  apps/admin  │───────▶└─────────────────────────────────────┘
            │  dashboard   │◀── WS
            └──────────────┘
```

One backend, two frontends, two sales channels that converge on the same order pipeline:

- **Website channel** — visitor builds a cart on the storefront, taps *Checkout on WhatsApp*. The API creates a short-lived checkout token (`RD-XXXXXX`), soft-reserves stock, and returns a `wa.me` deep link. The customer lands in WhatsApp with the cart pre-confirmed; Kukua collects the delivery address and sends the Paystack payment link. Orders are tagged `source = website`.
- **WhatsApp Direct channel** — the customer messages the business number and chats through catalog, cart, address, and payment entirely with the bot. Orders are tagged `source = whatsapp_direct`.

## Backend structure (`apps/api/src`)

| Layer | Files | Responsibility |
|---|---|---|
| Entry | `index.ts`, `app.ts` | HTTP server, WS upgrade, retention scheduler. `express-async-errors` guarantees async route failures reach the 500 handler |
| Routes | `routes/storefront.ts` | Public: catalog, product, search, zones, cart, handoff |
| | `routes/admin.ts` | JWT-protected: orders, inventory, inbox, analytics, CRM, zones, staff, CSV export |
| | `routes/webhooks.ts` | Paystack `charge.success`, WhatsApp inbound messages + Meta verification |
| Services | `services/bot.ts` | Intent engine: greetings, catalog Q&A, cart ops, address capture, payment nudges, handoff triggers (§10), fail-count escalation |
| | `services/handoff.ts` | Website→WhatsApp checkout: token issue, rate limiting (§14.1), duplicate suspicion (§14.5), soft reservation |
| | `services/orders.ts` | Order lifecycle state machine, rider assignment, failed delivery, cancellation |
| | `services/payments.ts` | Payment links, webhook processing, idempotency (§5.7), double-pay detection (§5.8), refunds (§5.9) |
| | `services/inventory.ts` | Reserve/release/deduct semantics (§6), restock, adjustments, low-stock alerts |
| | `services/cart.ts`, `services/catalog.ts`, `services/address.ts` | Server-authoritative cart; live catalog projection; zone text/pin matching (§7) |
| | `services/messaging.ts` | Reliable outbound send: retries, 24h-window template fallback (§12.4), undeliverable flagging (§12.2) |
| | `services/retention.ts` | 3-day check-in / 14-day cross-sell / 60-day win-back (§16), STOP opt-out |
| | `services/realtime.ts` | WebSocket hub; `channel=admin` and `channel=web` broadcasts |
| Adapters | `adapters/whatsapp.ts` | Simulator or Meta Cloud API (inbound normalize + outbound send) |
| | `adapters/paystack.ts` | Simulator or real Paystack (initialize, webhook verify, refund) |
| | `adapters/images.ts` | Data-URI SVG placeholders or Cloudinary URLs; upload validation (§14.6) |
| Infra | `db.ts`, `sessionStore.ts`, `clock.ts`, `config.ts` | Prisma client; KV session store (in-memory, Redis-ready); injectable clock for tests; env config |

## Simulator-first, real-ready adapters

Every external dependency sits behind an adapter with two implementations selected by env var:

| Adapter | Sim behavior | Real switch |
|---|---|---|
| WhatsApp | In-process message queue; sends recorded and echoed back to a dev inbox | `WHATSAPP_MODE=real` + Meta token/phone-ID; webhook route already handles Cloud API payloads |
| Paystack | Deterministic `initialize → emitChargeSuccess` with HMAC-signed webhook emission | `PAYSTACK_MODE=real` + secret key; webhook signature verified with the same code path |
| Images | Data-URI SVG brand placeholders | `IMAGES_MODE=cloudinary` + `CLOUDINARY_URL` |

Tests exercise the simulators; the production code paths share the same interfaces, so going live is configuration, not code.

## Key invariants

- **Money is integer pesewas** everywhere (`*P` fields). `formatGHS()` in `@rose/shared` is the only formatter.
- **Stock**: `available = stockQuantity − reservedStock`. Handoff *soft-reserves* (15-min TTL); webhook success *hard-deducts*. Expired reservations release automatically (§4.7, §6.3).
- **Server cart is source of truth** — the storefront sync its local bag to `/api/cart/:sessionId` and trusts the server response (§4.5).
- **Webhooks are idempotent** by `paystackRef`; late webhooks are honored, never lost (§5.6, §12.5, §13.2).
- **Human-first escalation** — the bot never negotiates, never fabricates, and hands off on any of: explicit request, 3 unrecognized messages, voice note, VIP cart (≥ GHS 1,000), out-of-zone address, post-payment address change (§10, §7).

## Realtime

WebSocket at `ws://localhost:4000/ws?channel=admin|web`. Events:

| Event | Audience | Trigger |
|---|---|---|
| `order.created` / `order.updated` | admin, web | order lifecycle changes |
| `stock.updated` | web | restock / reservation release |
| `inbox.alert` | admin | conversation handed to human |
| `alert.low_stock` | admin | threshold crossed (§6.7) |
| `alert.vip` | admin | cart ≥ GHS 1,000 (§10.4) |
| `alert.security` | admin | forged webhook rejected (§14.3) |

Frontends also poll as a fallback so a dropped socket never hides data.

## Frontends

- **`apps/web`** — Next.js 15 App Router, client-rendered against the API. Editorial asymmetric layouts per `figma.ui/ux.md`; WhatsApp green reserved exclusively for the handoff CTA. Session ID `web-*` in `localStorage`; cart metadata mirrored locally, server state authoritative.
- **`apps/admin`** — Next.js 15 App Router. JWT stored in `localStorage` after `POST /api/admin/login`; every request carries `Authorization: Bearer`. Owner-only surfaces (Settings, staff management) are gated client-side and server-side (`requireOwner`).
