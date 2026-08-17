# ROSE & DENIM Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full WhatsApp-hybrid e-commerce platform (87 behavioral scenarios) per `docs/superpowers/specs/2026-08-17-rose-denim-platform-design.md`.

**Architecture:** npm-workspaces monorepo — Express+TS API (services over Prisma/SQLite, adapters for Paystack/Meta/Redis with simulators), Next.js 15 storefront, Next.js 15 admin. Deterministic clock + in-memory TTL store make all TTL scenarios testable.

**Tech Stack:** TypeScript, Express 4, Prisma 5 (SQLite), Vitest, ws, Next.js 15 (App Router), Tailwind CSS 3.

**Conventions (all tasks):** money in integer pesewas; UTC timestamps; all test cases annotated `Scenario §<docSection>.<n>`; commit after each task; services never import from routes.

---

### Task 1: Monorepo foundation
**Files:** `package.json` (workspaces, scripts: `dev`, `dev:api`, `dev:web`, `dev:admin`, `test`, `db:push`, `db:seed`, `build`), `tsconfig.base.json` (strict, ES2022, moduleResolution bundler), `.gitignore`, `.env.example`, `README.md`.
- [ ] Create root files; `npm install` works at root.

### Task 2: Shared package
**Files:** `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts` — exports: `OrderStatus`, `OrderSource`, `ConversationStatus`, `ChangeType`, `AdminRole` enums; `CartItem`, `TokenPayload`, `WebhookEvent` types; `formatGHS(pesewas)`, `VIP_THRESHOLD_PESWAS = 100000`, `TOKEN_TTL_MIN = 15`, `CART_TTL_MIN = 30`.

### Task 3: API skeleton + data layer
**Files:** `apps/api/package.json` (express, @prisma/client, prisma, jsonwebtoken, bcryptjs, zod, ws, cors, dotenv; dev: vitest, tsx, typescript, @types/*), `apps/api/tsconfig.json`, `apps/api/prisma/schema.prisma` (all 15 models from spec §4), `src/config.ts` (env + simulator flags), `src/db.ts` (PrismaClient singleton), `src/clock.ts` (`now()`, `setNow()` test injection), `src/sessionStore.ts` (`KVStore` interface: get/set(ttlMs)/del/keys; `MemoryKVStore` with expiry sweep), `prisma/seed.ts` (5 categories, 12 products w/ variants, 8 Accra zones incl. East Legon 2500, owner `kukua`/env password).
- [ ] `npm run db:push && npm run db:seed` succeeds; test `sessionStore.test.ts` proves TTL expiry with fake clock.

### Task 4: Adapters
**Files:** `src/adapters/paystack.ts` (`PaystackAdapter` interface: initialize, verifyRef, refund; `SimPaystack` generates refs and can `emit(event, signature?)`; `RealPaystack` via fetch w/ `PAYSTACK_SECRET_KEY`), `src/adapters/whatsapp.ts` (`WhatsAppSender` interface: sendText, sendTemplate, sendLocation; `SimSender` records to in-memory `outbox` + supports `simulateFailure`/`simulateBlock`; `MetaSender` via Graph API), `src/adapters/images.ts` (placeholder URL builder; Cloudinary passthrough).
- [ ] Test: sim paystack emits charge.success consumed by a handler; sim whatsapp records send and failure injection.

### Task 5: Catalog + Inventory services
**Files:** `src/services/catalog.ts` (listActive w/ `available = stock - reserved`, byId/slug, search, sold-out flags), `src/services/inventory.ts` (`reserve`, `release`, `hardDeduct` w/ transactional guard, `restock`, `adjust` → `inventory_logs`, low-stock check → RealtimeHub alert).
- [ ] Tests `tests/scenarios/s03-discovery.test.ts` (§3.1–3.6 catalog states), `tests/scenarios/s06-inventory.test.ts` (§6.1, 6.6, 6.7).

### Task 6: Cart + Handoff services
**Files:** `src/services/cart.ts` (get/add/update/sync — add validates live available, throws `SOLD_OUT` → 409; cart in KVStore, 30-min TTL refreshed on touch), `src/services/handoff.ts` (`createToken` → reserve variants, 15-min TTL, rate limit 5/hr/phone via KVStore counter → `RATE_LIMITED`, duplicate detect same phone+items <10 min → `DUPLICATE_SUSPECT`, builds `https://wa.me/<num>?text=...` deep link; `cancelToken` releases reservation; `sweepExpiredTokens` releases stock).
- [ ] Tests `tests/scenarios/s04-cart-checkout.test.ts` (§4.1–4.8), partial `s14` (§14.1 rate limit, §14.5 duplicate).

### Task 7: Payments + Orders services
**Files:** `src/services/payments.ts` (`verifySignature` HMAC-SHA512, `handleChargeSuccess` — webhook_events ledger + unique payment ref idempotency; token expired → order `needs_admin_review`; order already PAID → flag `refund_due` + owner alert; `handleChargeFailure` — one retry allowed, then human-assist flag; `refund`), `src/services/orders.ts` (`createFromToken`, `createDirect`, status machine ALLOWED_TRANSITIONS incl. PACKED→PAID revert, `setStatus` fires template msg + stock hard-deduct on PAID, rider reassign, `stalePacked` query, cancel + stock release).
- [ ] Tests `s05-payments.test.ts` (§5.1–5.10), `s06` §6.2–6.5 reservations/race, `s08-orders.test.ts` (§8.1–8.6), `s15-cancel-refund.test.ts` (§15.1–15.5), `s14` §14.2–14.3.

### Task 8: Address + Bot engine
**Files:** `src/services/address.ts` (`matchZone(text)` alias/regex, `matchPin(lat,lng)` nearest zone by seeded coords, out-of-zone & unrecognized results), `src/services/bot.ts` (conversation state machine: MENU→BROWSE→DETAIL→ADDRESS→PAY; intents: cancel, STOP→marketing opt-out, human keywords, negotiation regex → handoff, voice note → handoff, 3 consecutive unrecognized → NEEDS_HUMAN, VIP alert > GHS 1000; `takeOver`/`release`).
- [ ] Tests `s07-address.test.ts` (§7.1–7.6), `s09-multichannel.test.ts` (§9.1–9.5), `s10-handoff.test.ts` (§10.1–10.7).

### Task 9: Messaging reliability + Retention + Realtime
**Files:** `src/services/messaging.ts` (send w/ retry ≤3, backoff; persistent failure → `undeliverable` flag on conversation; template fallback outside 24h window), `src/services/retention.ts` (`tick(now)` — 3-day check-in, 14-day cross-sell, 60-day win-back w/ reset on new order, skip `marketing_opt_out`), `src/services/realtime.ts` (`ws` hub: channels `web`, `admin`; broadcast helpers used by inventory/orders/bot).
- [ ] Tests `s12-messaging.test.ts` (§12.1–12.5), `s16-retention.test.ts` (§16.1–16.5), `s13-outages.test.ts` (§13.1–13.5 via adapter failure injection).

### Task 10: HTTP routes + auth + server
**Files:** `src/middleware/auth.ts` (JWT issue/verify, `requireRole`), `src/routes/`: `catalog.ts`, `cart.ts`, `handoff.ts`, `orders.ts` (public token status lookup — unknown token → generic message, §14.2), `webhooks.ts` (GET meta verify handshake, POST meta inbound → bot, POST paystack w/ signature check), `admin.ts` (login, orders CRUD+status, inventory, zones, customers, inbox take-over/release, analytics, exports CSV, staff mgmt owner-only, image upload validation ≤5MB images-only), `src/index.ts` (Express app, CORS, WS attach, retention interval, sweep interval).
- [ ] Server boots on :4000; smoke tests for auth scoping (§11.6) and upload validation (§14.6).

### Task 11: Storefront (apps/web)
**Files:** Next.js 15 app: `app/page.tsx` (asymmetric hero, category strip, New In), `app/shop/[category]/page.tsx`, `app/product/[slug]/page.tsx`, `app/search/page.tsx`, `app/handoff/page.tsx` (transition screen), `components/` (Navbar, MobileMenu, ProductCard w/ placeholder fallback + sold-out badge, MiniCart drawer, WhatsAppCTA), `lib/api.ts`, `lib/cart.ts` (local + session sync), `tailwind.config.ts` (brand palette + Fraunces/Inter via next/font). All UX rules from `figma.ui/ux.md` §3.1–3.6.
- [ ] `npm run dev:web` renders all pages against API.

### Task 12: Admin dashboard (apps/admin)
**Files:** Next.js 15 app: `app/login/page.tsx`, `app/(dash)/orders/page.tsx` + `[id]/page.tsx` (timeline + embedded thread), `inventory/page.tsx`, `inbox/page.tsx` (take over/release), `analytics/page.tsx`, `customers/page.tsx`, `settings/page.tsx` (zones, staff), `components/` (StatusPill, ChatBubbles, Timeline, KPI), `lib/api.ts` w/ JWT. UX rules from `figma.ui/ux.md` §3.7–3.13; WS client w/ poll fallback.
- [ ] `npm run dev:admin` renders all pages; login flow works.

### Task 13: Wiki
**Files:** `wiki/Home.md`, `Architecture.md`, `Getting-Started.md`, `Data-Model.md`, `API-Reference.md`, `Webhook-Security.md`, `Bot-Behavior-Matrix.md`, `Order-Lifecycle.md`, `Inventory-and-Reservations.md`, `Retention-Automation.md`, `Admin-Permissions.md`, `Deployment.md`, `Env-Configuration.md`, `Scenario-Coverage-Matrix.md` (all 87 → file → test), `Troubleshooting.md`, `Roadmap.md`, `_Sidebar.md`.

### Task 14: Verification
- [ ] `npm run db:push`, `db:seed`, `npm test` (all scenario suites green), `npm run build` for web+admin, boot API + both frontends, fix failures.
