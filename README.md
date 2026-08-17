# ROSE & DENIM BY KUKUA

WhatsApp-hybrid e-commerce platform — an editorial storefront where checkout hands off into a WhatsApp conversation with Kukua, the shop's bot, plus a full admin studio. Built against an 87-scenario behavioral reference; every scenario is implemented and covered by automated tests.

## Quick start

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev        # api :4000 · storefront :3000 · admin :3001
```

Admin login (seeded): `kukua@roseanddenim.com` / `denim-rose-2026`. WhatsApp and Paystack run as local simulators — no external accounts needed.

```powershell
npm test           # 87 scenario tests
npm run build      # production builds (web + admin)
```

## Documentation

Everything lives in the **[wiki](./docs/wiki/Home.md)**:

- [Home](./docs/wiki/Home.md) — overview & quick start
- [Architecture](./docs/wiki/Architecture.md) — system design, adapters, realtime events
- [Data Model](./docs/wiki/Data-Model.md) — schema, money conventions, order state machine
- [API Reference](./docs/wiki/API-Reference.md) — every endpoint
- [Scenario Coverage Matrix](./docs/wiki/Scenario-Coverage-Matrix.md) — all 87 behavioral scenarios → tests
- [Design System](./docs/wiki/Design-System.md) — palette, typography, UX rules
- [Operations](./docs/wiki/Operations.md) — env vars, going live, troubleshooting

Design spec: `docs/superpowers/specs/` · Implementation plan: `docs/superpowers/plans/`.

## Stack

npm workspaces · Express 4 + Prisma 5 (SQLite) + Vitest · Next.js 15 × 2 · Tailwind · WebSocket realtime · simulator-first adapters for WhatsApp Cloud API / Paystack / Cloudinary.
