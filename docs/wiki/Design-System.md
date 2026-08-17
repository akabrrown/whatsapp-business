# Design System

Source of truth: `figma.ui/ux.md` (13 screen specs, §3.1–3.13). Both frontends share the same tokens, implemented as Tailwind theme extensions.

## Palette

| Token | Hex | Use |
|---|---|---|
| `indigo` | `#2C3E66` | Primary — headlines, CTAs, active states |
| `indigo-deep` | `#22314F` | Hover states, emphasis blocks |
| `rose` | `#C97B84` | Brand accent — highlights, refunds/attention |
| `cream` | `#FAF7F5` | Page background (off-white) |
| `charcoal` | `#2B2B2B` | Body text |
| `sand` | `#D9A679` | Secondary accent — flags, tags, borders (`sand/20–/50` opacities) |
| `wagreen` | `#25D366` | **Storefront only** — exclusively the WhatsApp handoff CTA. Nowhere else. |
| `sage` | `#8FA98F` | **Admin only** — success/positive states |

Rules that matter:
- WhatsApp green must never appear outside the handoff button — it is a single-meaning signal ("this takes you to WhatsApp").
- No gradients, no glassmorphism, no heavy shadows. Flat surfaces, hairline `sand` borders, subtle `white/40–50` panels on cream.

## Typography

- **Fraunces** (serif) — headlines, order numbers, revenue figures; loaded via `next/font/google`, CSS var `--font-fraunces`, class `font-serif`.
- **Inter** — body, tables, forms; `--font-inter`, default sans.
- Editorial contrast: large serif display text against small uppercase-tracked labels (`text-xs uppercase tracking-wide`).

## Anti-generic directives (from ux.md)

- **Asymmetric layouts** — offset grids (e.g. storefront `lg:grid-cols-[7fr_5fr]`), staggered product cards; avoid perfectly centered hero stacks.
- **Varied corner radii** — mix sharp corners, small radii, and single-corner rounding rather than one uniform radius.
- **Editorial tone** — copy reads like a fashion magazine, not a SaaS dashboard; generous whitespace; charcoal-on-cream rather than pure black/white.

## Per-app notes

**Storefront (`apps/web`)** — cream background throughout; product imagery from the API (data-URI SVG placeholders in sim mode, rendered with plain `<img>` since they aren't HTTP URLs); mini-cart drawer with the green handoff CTA as the only saturated element; `/handoff` page mimics a WhatsApp chat preview before auto-redirect.

**Admin (`apps/admin`)** — denser, table-first; restrained status pills (indigo/sand/sage tints, never bright colors); the WhatsApp thread embedded in order detail uses the same chat bubble component as the inbox (customer bubbles left/white, business bubbles right/indigo).
