# Admin Controls, Empty Catalog & Icon System — Design Spec

**Date:** 2026-08-17
**Status:** Approved

## Goal

Complete the admin dashboard's missing page controls (all backed by existing,
test-covered API endpoints), replace the seeded mock catalog with an empty
store ready for real products, and replace every emoji in the web/admin UI
with proper SVG icons (lucide-react), adding icons to navigation and
action points that lack them.

## Scope

### 1. Add product page — `apps/admin/app/(dash)/products/new/page.tsx` (§11.1, §14.6)

- Form fields: name, slug (auto from name, editable), description,
  category dropdown (storefront `GET /api/categories`).
- Images: file upload → FileReader → data-URI; sends `upload: {contentType, size}`
  so §14.6 validation runs server-side; errors shown inline. Optional URL input too.
- Dynamic variant rows: size, color, price (GHS → pesewas), stock. Min 1 row.
- Submit → `POST /api/admin/products` → redirect to `/inventory`.
- "+ Add product" button in the inventory page header.

### 2. Manual stock adjustment (§6.6) — inventory page

Per-variant input accepting negative/positive delta + "adjust" button →
`POST /api/admin/inventory/:id/adjust`, note `dashboard adjustment`.
Complements positive-only restock.

### 3. Status filter — orders list

Status dropdown (All / RESERVED / PAID / PACKED / SHIPPED / DELIVERED /
CANCELLED) beside source tabs → `GET /api/admin/orders?status=&source=`.

### 4. CSV date range (§11.5) — orders list

From/to date inputs beside "Export CSV"; empty = all orders.
URL: `GET /api/admin/export/orders.csv?from=&to=`.

### 5. Zone on address edit (§7.5) — order detail

Zone dropdown from `GET /api/admin/zones` beside the address input; save
patches `deliveryAddress` + `zoneName` together.

### 6. Remove mock products

- `apps/api/prisma/seed.ts`: drop the 12 seeded products + variants.
  Keep owner, 5 categories, 8 zones.
- Purge existing Product/ProductVariant/InventoryLog/OrderItem rows from DB
  via a reset script so the live DB matches.
- Storefront empty state: catalog page renders a graceful
  "Collection arriving soon" message when empty.

### 7. Emojis → icons

Install `lucide-react` in `apps/web` and `apps/admin`.

**Replace (rendered UI only):**
- admin layout toasts: 💬 → MessageCircle, 📦 → Package, ✨ → Sparkles, 🛡 → Shield
- ChatBubbles voice note: 🎤 → Mic
- Navbar cart: 🧺 → ShoppingBag
- Arrow text `← back` / `→` → ChevronLeft / ArrowRight icons
- admin sidebar nav: icon per section (Package, Boxes, MessageSquare,
  BarChart3, Users, Settings)
- Action points that lack icons: export button (Download), restock (Plus),
  add-product button (Plus), save buttons (Check)

**Keep emojis:** WhatsApp pre-filled message text (handoff 🌹, sizing 🙈) —
they are sent as chat text where emojis are the correct medium.

## Non-goals

- Category CRUD, image hosting, product editing beyond hide/show.
- Bot message copy changes.

## Verification

- `npm test` — 87/87 still green (tests build their own baselines).
- `npm run build` — web + admin compile.
- Manual smoke: add a product via UI → appears in catalog; adjust stock;
  filter orders; export CSV with range; edit address+zone.
