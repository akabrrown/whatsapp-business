# Admin Controls, Empty Catalog & Icons — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.
> Spec: `docs/superpowers/specs/2026-08-17-admin-controls-icons-design.md`

**Goal:** Complete missing admin page controls, empty the mock catalog, replace emojis with lucide icons.

**Architecture:** All API endpoints already exist and are test-covered; work is
frontend-only (admin + web) plus seed script. Icons via `lucide-react`.

**Tech Stack:** Next.js 15 App Router, Tailwind, lucide-react, Prisma seed.

---

### Task 1: Install lucide-react + empty-state catalog

**Files:**
- Modify: `apps/web/package.json`, `apps/admin/package.json` (npm install)
- Modify: `apps/web/app/page.tsx` (empty state when catalog empty, ArrowRight icon)

- [x] `npm i lucide-react -w @rose/web -w @rose/admin`
- [x] Home page: if `products.length === 0` render "The collection is arriving soon" hero block instead of empty grid; replace `→` text with `<ArrowRight size={16} />`.

### Task 2: Remove mock products

**Files:**
- Modify: `apps/api/prisma/seed.ts` (drop product/variant seeding; keep owner, categories, zones)
- Create: `apps/api/prisma/reset-catalog.ts` (deletes Orders/Items/Variants/Products for the live DB)

- [x] Seed: remove product array + loop; adjust log line.
- [x] Reset script: `DELETE` OrderItem, InventoryLog, TokenItem, OrderToken, Payment, Order, ProductVariant, Product (keep categories/zones/admin).
- [x] Run reset against live DB, re-seed.

### Task 3: Add product page (§11.1, §14.6)

**Files:**
- Create: `apps/admin/app/(dash)/products/new/page.tsx`
- Modify: `apps/admin/app/(dash)/inventory/page.tsx` (header button → `/products/new`)

- [x] Form: name, slug (auto), description, category dropdown (fetch `/api/categories` from storefront URL), image upload (FileReader → data-URI, send `upload:{contentType,size}`), URL input, dynamic variant rows (size/color/price GHS/stock, min 1).
- [x] Submit → `POST /api/admin/products` → `router.push('/inventory')`; inline errors.

### Task 4: Inventory adjust + orders filters + zone edit

**Files:**
- Modify: `apps/admin/app/(dash)/inventory/page.tsx` (adjust input, note `dashboard adjustment`)
- Modify: `apps/admin/app/(dash)/orders/page.tsx` (status dropdown, CSV from/to inputs)
- Modify: `apps/admin/app/(dash)/orders/[id]/page.tsx` (zone dropdown, patch address+zoneName)

- [x] Adjust: number input (any int ≠ 0) + "adjust" → `POST /inventory/:id/adjust`.
- [x] Orders: `status` state → query param; date inputs wired into `exportCsv`.
- [x] Order detail: load zones, select bound to `order.zoneName`, save patches both fields.

### Task 5: Emojis → lucide icons

**Files:**
- Modify: `apps/admin/app/(dash)/layout.tsx` (toast icons + sidebar nav icons)
- Modify: `apps/admin/components/ChatBubbles.tsx` (Mic for voice)
- Modify: `apps/admin/app/(dash)/orders/[id]/page.tsx`, `customers/[id]/page.tsx` (ChevronLeft back, ArrowRight)
- Modify: `apps/web/components/Navbar.tsx` (ShoppingBag)

- [x] Toast: state `{icon: ReactNode, text: string}`; MessageCircle/Package/Sparkles/Shield.
- [x] NAV entries gain `icon` component; render in sidebar + mobile strip.
- [x] Add icons to remaining action buttons (Download export, Plus add/restock).

### Task 6: Verify

- [x] `npm run build` (web + admin)
- [x] `npm test` — 87/87
- [x] Smoke: boot API+admin, add product via UI, verify catalog.
- [x] Commit.
