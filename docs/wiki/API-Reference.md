# API Reference

Base URL `http://localhost:4000`. All JSON bodies are `{ ok, ... }`. Errors carry `error` (machine code) and often `message` (human text). All admin routes require `Authorization: Bearer <JWT>`.

## Storefront: `/api` (public)

### Discovery (§3)

| Method & path | Description |
|---|---|
| `GET /api/catalog?category=<slug>` | Active products with live stock; newest first. Sold-out products included but flagged (§3.2) |
| `GET /api/catalog/search?q=<term>` | Search; empty `products` is a valid answer (§3.6) |
| `GET /api/categories` | Category list with `flagship` flag |
| `GET /api/products/:slug` | Single product with variants; 404 `not_found` if inactive/unknown (§3.5) |
| `GET /api/zones/match?text=<address>` | Zone name/alias matching (§7.1) |

Product shape: `{ id, slug, name, description, category, images[], minPriceP, soldOut, totalAvailable, lowStock, variants: [{ id, sku, size, color, priceP, stockQuantity, available }] }`.

### Cart sessions (§4)

| Method & path | Body | Notes |
|---|---|---|
| `GET /api/cart/:sessionId` |: | Empty cart `{ items: [] }` if session expired (§4.3) |
| `POST /api/cart/:sessionId/items` | `{ variantId, qty? }` | 409 `{ error: 'SOLD_OUT' }` if the race was lost (§4.2) |
| `PATCH /api/cart/:sessionId/items` | `{ variantId, qty }` | `qty <= 0` removes the line |
| `POST /api/cart/:sessionId/sync` | `{ items: [{ variantId, qty }] }` | Full reconcile; server copy wins (§4.5) |

Sessions expire after 30 min idle; activity refreshes the TTL (§4.4).

### Handoff & checkout (§4.6–4.8)

| Method & path | Body | Notes |
|---|---|---|
| `POST /api/handoff` | `{ phone, sessionId?, items?, zoneName?, deliveryFeeP?, confirmedDuplicate? }` | Creates `RD-XXXXXX` token, soft-reserves stock (15-min TTL), returns `{ code, phone, expiresAt, whatsappUrl, totalP, vip, items[], zoneName?, deliveryFeeP? }`. When `sessionId` given, server cart wins and is cleared on success. Errors: 429 `RATE_LIMITED` (§14.1), 400 `EMPTY_CART` (§4.6), 409 `DUPLICATE_SUSPECT` (retry with `confirmedDuplicate: true`, §14.5), 409 `SOLD_OUT` |
| `POST /api/handoff/:code/cancel` |: | Customer cancels before payment (§15.1) |
| `POST /api/pay/token/:code` | payment metadata | Issues Paystack link; 410 if token gone (§5.6 money still honored via webhook) |
| `GET /api/orders/by-token/:code` |: | Status-only lookup; unknown codes get a generic message, never data (§14.2) |

## Webhooks: `/webhooks`

| Method & path | Description |
|---|---|
| `POST /webhooks/paystack` | Raw-body HMAC verification (`x-paystack-signature`); processes `charge.success` idempotently (§5.7). Forged signatures rejected + security alert (§14.3) |
| `GET /webhooks/whatsapp` | Meta verification handshake (`hub.verify_token`) |
| `POST /webhooks/whatsapp` | Meta Cloud API inbound (text / audio → §10.3 / location → §7.2); always ACKs 200 fast |
| `POST /webhooks/whatsapp/sim-inbound` | **Sim-only** console: `{ phone, text?, kind?, lat?, lng? }`: inject a WhatsApp message locally |

## Admin: `/api/admin` (JWT)

### Auth

| Method & path | Body | Notes |
|---|---|---|
| `POST /api/admin/login` | `{ email, password }` | `{ token, user: { email, name, role } }`; 401 `invalid_credentials` (§14.4) |

### Orders (§8, §11)

| Method & path | Notes |
|---|---|
| `GET /orders?status=&source=` | Newest first (200); rows include computed `stalePacked` (§8.6) |
| `GET /orders/:id` | `{ order, messages }`: full detail + WhatsApp thread |
| `POST /orders/:id/status` | Body `{ status }`; invalid transition → 409 (§8.4 silent PACKED→PAID revert supported) |
| `POST /orders/:id/rider` | Body `{ riderName, riderPhone }`; notifies customer (§8.5) |
| `POST /orders/:id/failed-delivery` | Stays SHIPPED, bot follows up (§8.2) |
| `POST /orders/:id/cancel` | Cancel + refund flow (§15.2) |
| `POST /orders/:id/refund` | Issue refund (§5.9) |
| `PATCH /orders/:id/address` | Body `{ deliveryAddress?, zoneName? }`; 409 `already_shipped` (§7.5, §7.6) |

### Inventory & products (§6, §11.1–11.3)

| Method & path | Notes |
|---|---|
| `GET /inventory` | Variants with `available`, `lowStock`, `productStatus` |
| `POST /inventory/:variantId/restock` | `{ qty, note }`: per-SKU log + realtime push (§11.3) |
| `POST /inventory/:variantId/adjust` | `{ delta, note }`: silent adjustment (§6.6) |
| `POST /products` | `{ name, categoryId, variants[], … }`: live immediately (§11.1); optional `upload` validated (§14.6) |
| `PATCH /products/:id` | `{ status: 'active'\|'inactive' }` (§11.2) |

### Zones (§11.4)

| Method & path | Notes |
|---|---|
| `GET /zones` | All zones with fees |
| `PATCH /zones/:id` | `{ feeP }`: applies to new orders only |

### CRM, inbox, analytics (§9.3, §10, §11.5)

| Method & path | Notes |
|---|---|
| `GET /customers` | By lifetime value desc; `tags` JSON includes `repeat_buyer`/`vip` |
| `GET /customers/:id` | Orders + conversations + messages |
| `GET /inbox` | Conversations with customer + last message |
| `GET /inbox/:id/messages` | Full thread |
| `POST /inbox/:id/take-over` | Bot goes silent (§10.6) |
| `POST /inbox/:id/release` | Bot resumes (§10.7) |
| `POST /inbox/:id/messages` | `{ body }`: send reliably as the business |
| `GET /analytics?days=30` | `{ revenueP, orderCount, bySource, byStatus, topProducts }` |
| `GET /export/orders.csv?from=&to=` | CSV download (`text/csv`) |

### Staff & ops (owner only, §11.6)

| Method & path | Notes |
|---|---|
| `GET /staff` · `POST /staff` | List / create (`{ email, name?, password, role }`); staff role gets 403 |
| `POST /retention/tick` | Manual retention engine run (§16) |

## WebSocket: `/ws`

Connect `ws://localhost:4000/ws?channel=admin` or `?channel=web`. Server pushes `{ type, payload }`: `order.created`, `order.updated`, `stock.updated`, `inbox.alert`, `alert.low_stock`, `alert.vip`, `alert.security`.

## Health

`GET /health` → `{ ok: true, service: 'rose-denim-api' }`.
