# ROSE & DENIM BY KUKUA: Platform Wiki

A WhatsApp-hybrid e-commerce platform for ROSE & DENIM BY KUKUA (Accra, Ghana). Customers browse an editorial storefront, check out **into a WhatsApp conversation** where a bot named Kukua completes payment and fulfillment: or they can chat directly with the business from the start. Every order, whichever channel it started on, flows through one shared backend.

The behavioral contract is `ROSEDENIM_Complete_Functional_Behavior_Reference.docx`: 87 scenarios across 14 categories. All 87 are implemented and covered by automated scenario tests; see the [Scenario Coverage Matrix](./Scenario-Coverage-Matrix.md).

## Repository layout

```
apps/
  api/      Express + Prisma (SQLite) backend: bot engine, orders, payments, webhooks, admin API
  web/      Next.js 15 storefront (:3000)
  admin/    Next.js 15 admin dashboard (:3001)
packages/
  shared/   Money formatting, order/conversation status constants, contracts
docs/
  wiki/     This wiki
  superpowers/specs/   Design spec
  superpowers/plans/   Implementation plan
```

npm workspaces; all apps share `@rose/shared` (consumed as TypeScript source, transpiled by the frontends).

## Quick start

Prereq: Node 20+.

```powershell
npm install
npm run db:push     # create SQLite schema
npm run db:seed     # seed owner account, catalog, zones
npm run dev         # boots api (:4000), web (:3000), admin (:3001) concurrently
```

| App | URL | Notes |
|---|---|---|
| API | http://localhost:4000 | REST + WebSocket `/ws` + webhooks |
| Storefront | http://localhost:3000 | Browse → bag → WhatsApp handoff |
| Admin | http://localhost:3001 | Login: `kukua@roseanddenim.com` / `denim-rose-2026` |

The WhatsApp and Paystack integrations run against **simulator adapters** by default: the bot and payments work end-to-end locally with no external accounts. Swapping in the real adapters is configuration only (see [Operations](./Operations.md)).

## Test & build

```powershell
npm test            # 87 scenario tests (Vitest) against an isolated test DB
npm run build       # production builds of web + admin
```

## Wiki pages

| Page | What it covers |
|---|---|
| [Architecture](./Architecture.md) | System design, data flows, adapter model, realtime |
| [Data Model](./Data-Model.md) | Prisma schema, money conventions, status machines |
| [API Reference](./API-Reference.md) | Every REST/WebSocket endpoint, storefront + admin |
| [Scenario Coverage Matrix](./Scenario-Coverage-Matrix.md) | All 87 behavioral scenarios → tests → code |
| [Design System](./Design-System.md) | Palette, typography, UX rules from `figma.ui/ux.md` |
| [Operations](./Operations.md) | Env vars, seeding, switching to real WhatsApp/Paystack |
