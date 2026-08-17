# Data Model

Prisma schema: `apps/api/prisma/schema.prisma` · SQLite (`prisma/dev.db`, tests use `prisma/test.db`).

**Money convention:** every monetary value is an integer in **pesewas** (1 GHS = 100 pesewas), field names suffixed `P`. Prices are snapshotted onto order items at order time.

## Catalog

| Model | Key fields | Notes |
|---|---|---|
| `Category` | `name`, `slug`, `flagship` | Flagship category featured on homepage |
| `Product` | `slug`, `status` (`active`\|`inactive`), `images` (JSON array) | Inactive products disappear from catalog & bot but past orders keep working (§3.3, §11.2) |
| `ProductVariant` | `sku`, `size`, `color`, `priceP`, `stockQuantity`, `reservedStock`, `lowStockThreshold` | `available = stockQuantity − reservedStock`; crossing threshold fires admin alert only (§6.7) |
| `InventoryLog` | `changeType` (`purchase`\|`reserve`\|`release`\|`restock`\|`adjustment`), `delta`, `note` | Every stock movement is audited (§11.3) |

## Customers & conversations

| Model | Key fields | Notes |
|---|---|---|
| `Customer` | `phone` (unique), `tags` (JSON, e.g. `repeat_buyer`, `vip`), `totalOrders`, `totalSpentP`, `marketingOptOut` | `marketingOptOut` honors STOP (§16.5); transactional messages continue |
| `Conversation` | `status` (`BOT`\|`NEEDS_HUMAN`\|`HUMAN`), `failCount`, `undeliverable`, `sendFailures`, `lastMsgAt` | One continuous thread per phone number, even across devices (§9.5) |
| `Message` | `direction` (`inbound`\|`outbound`), `kind` (`text`\|`voice`\|`location`\|`image`), `body` | Full thread replay in admin order view & inbox |

## Checkout & orders

| Model | Key fields | Notes |
|---|---|---|
| `OrderToken` | `code` (`RD-XXXXXX`), `status` (`ACTIVE`\|`USED`\|`EXPIRED`\|`CANCELLED`), `expiresAt` | Website→WhatsApp handoff; 15-min TTL; soft-reserves stock (§4.7) |
| `TokenItem` | `variantId`, `qty` | Cart snapshot at handoff |
| `Order` | `number`, `status`, `source` (`website`\|`whatsapp_direct`), `subtotalP`/`deliveryFeeP`/`totalP`, `zoneName`, `riderName`, `vip`, `needsAdminReview`, `refundDue`, `failCount`, `packedAt`, `deliveredAt`, `conversationId` | Flags: `vip` ≥ GHS 1,000 (§10.4); `needsAdminReview` = late webhook on expired token (§5.6); `refundDue` = double payment (§5.8) |
| `OrderItem` | `variantId`, `qty`, `unitPriceP` | Price snapshot |
| `Payment` | `paystackRef` (unique: idempotency key §5.7), `amountP`, `channel` (`card`\|`mobile_money`\|`bank_transfer`), `status`, `tokenCode`, `flaggedForRefund` | |
| `WebhookEvent` | `provider`+`ref` unique, raw `payload` | Dedupe store; audit trail (§14.3) |

## Delivery & operations

| Model | Key fields | Notes |
|---|---|---|
| `DeliveryZone` | `name`, `city`, `feeP`, `aliases` (JSON), `lat`/`lng` | Text matching via name/aliases (§7.1), pin matching via nearest coordinate (§7.2). Fee edits apply to new orders only (§11.4) |
| `AdminUser` | `email`, `role` (`owner`\|`staff`), bcrypt `password` | Staff cannot manage staff (§11.6) |
| `RetentionState` | `checkinSent`, `crosssellSent`, `winbackSent` per (customer, order) | 3-day / 14-day / 60-day touchpoints (§16) |

## Order status machine

```
RESERVED ──webhook success──▶ PAID ──▶ PACKED ──▶ SHIPPED ──▶ DELIVERED
    │                          │          │ ▲         │
    │ token expiry / cancel    │          │ │ §8.4 silent revert (wrong item)
    ▼                          ▼          │ └ failed delivery stays SHIPPED (§8.2)
CANCELLED ◀──cancel+refund────┴──────────┘
REFUNDED  ◀──refund issued (§5.9)──
```

Guards: no address edits once `SHIPPED` (§7.6); stale-PACKED (>24 h) is flagged, never auto-messaged (§8.6); cancellations release stock and trigger refunds only through explicit admin/customer-approved paths (§15).

## Session/cache layer

`sessionStore.ts` exposes a `KVStore` interface (`get/set/del/keys/touch/clear`) with TTL semantics. The in-memory implementation backs cart sessions (§4.3 30-min idle), order tokens (§4.7 15-min TTL), and rate-limit windows (§14.1). Losing the store (simulating a Redis outage) drops sessions but never orders or payments (§13.5). Point `REDIS_URL` at Redis to swap implementations.
