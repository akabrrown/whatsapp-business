# ROSE & DENIM BY KUKUA — Figma UI/UX Prompt Library

**Purpose:** Ready-to-paste prompts for generating every screen in Figma (First Draft / Figma AI or a human designer brief) so the output looks like an expert human designer's work — not a template.

---

## How to Use This

1. Paste **Section 0 (Master Brand Brief)** into Figma first, or keep it open as your style anchor — every other prompt assumes this foundation.
2. Paste **Section 1 (Anti-AI-Generic Directives)** *alongside* every single screen prompt. This is the part that actually prevents the generic look — don't skip it just because it's repetitive.
3. Use the **Section 3** per-screen prompts one at a time, not all at once. Generating screen-by-screen gives you room to course-correct before the "AI look" compounds across the file.
4. Read **Section 4 (Workflow Tips)** before you start — it tells you what to manually fix *after* generation, which matters as much as the prompt itself.

---

## 0. Master Brand Brief (Paste First)

```
Design system: ROSE & DENIM BY KUKUA — a Ghana-based fashion brand selling jeans,
female wear, slippers, bags, and accessories, ordered via a hybrid website +
WhatsApp checkout experience.

Mood: warm, confident, editorial — a small, personal fashion label with real
craft behind it, not a mass-market dropshipping store. Think a boutique you'd
find on a stylish Accra street corner that also happens to have excellent
digital taste.

Color palette (use as the foundation, adjust once real brand assets exist):
- Deep denim indigo #2C3E66 — primary, used for text, headers, and structure
- Dusty rose #C97B84 — accent, used sparingly for CTAs, highlights, and warmth
- Warm off-white #FAF7F5 — base background, NOT pure white — pure white reads
  as generic SaaS/AI-generated
- Charcoal #2B2B2B — body text, never pure black
- One warm neutral (sand/terracotta, around #D9A679) as a tertiary accent for
  tags, badges, and small UI details — this is what keeps the palette from
  feeling like a flat two-color AI preset

Typography: pair a warm, slightly editorial serif for headlines (something in
the spirit of GT Sectra, Canela, or Reckless — NOT a generic geometric sans
like Poppins/Montserrat for headlines) with a clean, humanist sans for body
and UI text (Inter is fine for body copy ONLY, never for headlines — headline
type is where "AI-generated" projects give themselves away first).

Imagery: warm, natural-light product photography with real texture — denim
weave visible, fabric folds, a hand adjusting a strap. Avoid perfectly
symmetrical product-on-white-background shots for everything; mix in
lifestyle/editorial shots at an angle, slightly cropped, the way a fashion
editorial does it — not centered stock-photo composition.

Overall layout instinct: confident asymmetry over perfect grids. Real fashion
sites (see Section 2) break their own grid on purpose — a product image
bleeding past its column, a headline overlapping an image edge, uneven
column widths. A perfectly even, centered, symmetrical layout on every
screen is one of the biggest tells of an AI-generated design.
```

---

## 1. Anti-AI-Generic-Design Directives (Paste With Every Screen)

```
Explicitly avoid the following — these are the most common tells of
AI-generated / template UI, and the design should read as hand-crafted by
a human designer with strong fashion-industry taste:

- NO purple-to-blue or pink-to-purple gradient backgrounds anywhere
- NO glassmorphism (frosted glass cards, blurred translucent panels)
- NO centered hero section with a floating 3D blob shape and a stock
  illustration of a person pointing at a phone
- NO generic rounded-corner-everything (8px radius on literally every
  element) — vary corner treatment intentionally, some elements sharp,
  some soft, based on hierarchy
- NO default Inter/Poppins/Montserrat used for headlines — that combination
  is the single fastest way a design reads as AI-template-generated
  (body text is fine in a humanist sans)
- NO evenly spaced, perfectly symmetrical 3-column or 4-column grids for
  every section — break the grid deliberately in at least one place per screen
  the way an editorial layout would
  NO generic icon sets where every icon is the exact same stroke weight and
  style with no personality (outline-only Feather/Heroicons defaults) —
  either commission a custom icon feel or mix icon weight/fill deliberately
- NO stock "team high-fiving" or generic diverse-stock-photo-grid imagery
- NO oversized, empty whitespace sections with a single centered headline
  and a button and nothing else — that "SaaS landing page" pattern doesn't
  fit a fashion brand's density and warmth
- NO drop shadows on every card at the same default blur/opacity — treat
  elevation intentionally and sparingly
- Do NOT make every button pill-shaped by default — vary button shape by
  context (primary CTA vs. secondary vs. tag/filter chip)

Instead: reference the specific real products in Section 2, extract their
underlying design PRINCIPLES (density, asymmetry, typography confidence,
texture), and reinterpret them for this brand — do not copy their layouts
directly.
```

---

## 2. Reference Anchors — Study These, Don't Copy Them

Use these as taste calibration. Pull specific *principles*, not literal layouts:

| Reference | What to Extract |
|---|---|
| **Rouje** (rouje.com) | Editorial serif headlines, warm muted palette, product photography that feels like a lookbook, not a catalog |
| **Doen** (doen.com) | Airy but textured layout, mixing polaroid-style candid shots with clean product shots, confident negative space that still feels warm |
| **Glossier** (glossier.com) | How a single accent color (their pink) is used *sparingly and precisely* rather than everywhere — restraint as a design choice, plus playful, human microcopy instead of generic button labels |
| **Christie Brown** (Ghanaian luxury fashion label) | Reference for authentic African high-fashion digital presence — richness, cultural confidence, not a Westernized template dropped into a Ghanaian market |
| **Shopify Admin** | Dense, data-heavy dashboard that still feels approachable and human — clear hierarchy without feeling sterile or overly "enterprise SaaS" |
| **Linear** (linear.app) | Restrained color use in a dashboard context, sharp and deliberate typography, no unnecessary decoration — useful for the admin side specifically |
| **WhatsApp** (native app UI) | The handoff/checkout screen should feel like a natural extension of WhatsApp's own visual language — bubble shapes, native-feeling confirmation patterns — so the transition from website to WhatsApp feels seamless, not jarring |

---

## 3. Screen-by-Screen Prompts

### 3.1 Website — Homepage

```
Design the ROSE & DENIM homepage. Above the fold: an asymmetric hero — a
large editorial lifestyle photo occupying roughly 60% of the width, bled to
one edge of the screen, with the headline and a short warm intro line
overlapping the image edge rather than sitting in a separate centered text
block. Avoid a centered hero with a single button — instead include the
headline, one line of brand voice copy, and a single understated CTA
("Shop the Collection") positioned asymmetrically, not dead-center.

Below the fold: a category navigation section styled as an editorial "shop
by category" strip — five categories (Jeans, Female Wears, Slippers, Bags,
Accessories) as tactile image cards of varying sizes (not a uniform grid —
make one card larger, e.g. Jeans, to reflect it as the flagship category).

Include a "New In" section using a slightly irregular grid — one large
featured product image alongside two smaller ones, not six equal squares.

Footer: warm off-white background, denim-blue text, includes a WhatsApp
contact prompt styled distinctly from a generic "contact us" link — treat
it as a genuine invitation to chat, using WhatsApp's green sparingly as a
small accent only in this one place, not throughout the site.
```

### 3.2 Website — Category / Catalog Grid

```
Design the product catalog/category page for ROSE & DENIM. Use a broken
grid, not a perfectly uniform one: most products in a standard grid, but
every 6th–8th item spans a slightly larger tile to create rhythm, the way
an editorial e-commerce layout (see Doen) avoids monotony.

Each product card: photo with a subtle hover-state crop shift (implied in
static design via an alternate angle thumbnail indicator), product name in
the humanist sans, price in denim-blue, and a small stock-status tag using
the sand/terracotta accent color for "Only 3 left" — styled as a small
label, not a loud red badge (red urgency badges are a common generic
e-commerce/AI tell).

Filter/sort controls: styled as understated text-based tabs and a minimal
dropdown, not heavy bordered pill buttons. Category filter chips should
vary slightly in width based on label length rather than being forced into
uniform fixed-width pills.
```

### 3.3 Website — Product Detail Page

```
Design the Product Detail Page. Two-column layout, but asymmetric: image
column slightly wider than the info column, with the primary product photo
large and a filmstrip of secondary angles below it — one of those secondary
photos should be a lifestyle/detail shot (fabric texture, stitching close-up)
not just another studio angle.

Right column: product name in the editorial serif, price, then size and
color selectors styled as tactile swatches (actual color swatches for
color, not just text buttons; size selector as a horizontal row of boxes
with the out-of-stock size shown crossed-out/greyed rather than hidden).

Stock indicator uses the same restrained sand/terracotta label style from
the catalog page, not a jarring red alert.

CTA: "Add to Selection" as a solid denim-blue button with sharp-ish corners
(4-6px radius, not fully pill-shaped) to distinguish it from generic
e-commerce "Add to Cart" pill buttons. Below it, a secondary, quieter link:
"Questions about sizing? Chat with us" as a genuine WhatsApp touchpoint,
not a generic help-icon.
```

### 3.4 Website — Mini-Cart / Slide-Out

```
Design the slide-out mini-cart panel. Avoid a generic white card with drop
shadow floating over a dimmed overlay — instead give the panel a warm
off-white background matching the site (not stark white), with a subtle
left-edge border in the sand accent color instead of a heavy shadow to
separate it from the page.

List items with small product thumbnails (slightly cropped/angled, not
perfectly centered squares), size/color noted in small caps, quantity
stepper styled as minimal +/- text controls rather than boxed buttons.

Subtotal shown with generous type size relative to the rest of the panel —
make the number feel important. Primary CTA: "Complete Order on WhatsApp"
using WhatsApp's brand green ONLY on this specific button as a deliberate,
singular accent — it should visually signal "this is the moment you leave
the site," distinct from every other button on the site which stays
denim-blue.
```

### 3.5 Website — WhatsApp Handoff Confirmation Screen

```
Design the brief transition/confirmation state shown for a split second
(or as a redirect screen) when a customer taps "Complete Order on
WhatsApp." Keep this screen minimal and native-feeling — a simple centered
message ("Opening WhatsApp...") with the order token subtly visible, styled
using rounded message-bubble shapes reminiscent of WhatsApp's own chat UI
so the transition from site to app feels like one continuous conversation
rather than a jarring context switch. Avoid a generic loading spinner on a
plain white screen — give it the same warm off-white background and brand
type as the rest of the site.
```

### 3.6 Website — Mobile Navigation & Menu

```
Design the mobile navigation menu (this is the primary experience — design
mobile-first, not as an afterthought of the desktop layout). Avoid a
generic hamburger menu that opens a plain vertical list of links on a white
background. Instead, style the open menu with the same warm off-white base,
category links in the editorial serif at a large confident size (this is a
fashion brand — the mobile menu should feel like a moment, not just
utility navigation), and a small featured image or texture accent in one
corner of the menu panel to avoid it feeling like a bare utility screen.
```

### 3.7 Admin Dashboard — Login

```
Design the admin login screen for Kukua and staff. Avoid the generic
centered-card-on-gradient-background pattern. Instead: split-screen layout
— one side a warm editorial brand image (reinforcing this is Kukua's own
business, not a generic SaaS tool), the other side a clean, minimal login
form on the warm off-white background, denim-blue as the primary button
color. Keep form styling restrained — simple underline or subtle-bordered
inputs, not heavy boxed inputs with default browser-style focus rings.
```

### 3.8 Admin Dashboard — Orders (List View)

```
Design the Orders dashboard list view. This is a data-dense screen — take
cues from Shopify Admin and Linear for information density done with
restraint, not from generic "admin dashboard template" marketplaces which
tend to over-decorate with unnecessary icons and color-coded everything.

Table/list styling: alternating row shading should be extremely subtle
(barely-there off-white vs. white, not grey stripes), status badges
(Paid/Packed/Shipped/Delivered) as small text pills using a restrained
palette — denim-blue, sand, and a muted sage-green for "delivered" —
avoid the generic red/yellow/green traffic-light status color convention,
which reads as a generic admin template default.

Include quick-action buttons inline (Mark Packed / Mark Shipped) styled as
understated text-buttons within the row, not heavy boxed buttons that
clutter the table. Top of page: a source filter (Website vs. WhatsApp
Direct) styled as simple text tabs, plus a prominent but not garish "X new
orders" indicator using the sand accent color.
```

### 3.9 Admin Dashboard — Order Detail

```
Design the individual order detail view. Layout: order summary and
timeline on one side (a vertical status timeline — Paid → Packed → Shipped
→ Delivered — styled with small connected dots and the sand accent color
for the current stage, not a generic horizontal stepper with default blue
circles), customer info, items, and payment reference on the other side.

Include an embedded mini conversation view showing the relevant WhatsApp
message thread for this order, styled using authentic chat-bubble
conventions (customer messages left-aligned in a neutral bubble, business
replies right-aligned in a denim-blue bubble) so staff can see conversation
context without leaving the order screen.
```

### 3.10 Admin Dashboard — Products & Inventory

```
Design the product/inventory management screen. Grid or table toggle for
viewing products; each product row/card shows a small thumbnail, name,
category, price, and stock count with an inline-editable quantity field
(styled as a simple number input with subtle +/- steppers, not a heavy
boxed form control). Low-stock items get a small sand-colored flag icon,
not a loud red warning banner. Include a clearly separated "Add Product"
flow styled consistently with the rest of the admin's restrained, editorial
aesthetic — this should NOT look like a generic Bootstrap/Material admin
template form with default input styling.
```

### 3.11 Admin Dashboard — Live Chat / WhatsApp Inbox

```
Design the unified WhatsApp inbox view for staff. Left panel: conversation
list with customer name, last message preview, and a small colored dot
indicating bot-handling vs. needs-human vs. human-handling (use denim-blue,
sand, and sage-green respectively — avoid generic red for "needs
attention," which feels alarmist for what is often just a normal customer
question). Right panel: the chat thread itself, styled with authentic
WhatsApp-like bubble conventions so staff feel at home immediately, plus a
compact order-context sidebar showing any linked order without needing to
navigate away.
```

### 3.12 Admin Dashboard — Analytics

```
Design the analytics/performance screen. Avoid generic dashboard cliché of
four identical KPI cards in a row with a random up/down arrow icon and a
tiny sparkline. Instead, give the primary revenue metric more visual weight
than the secondary metrics (larger type, more space) — establish a clear
hierarchy of what matters most. Use a restrained chart style: denim-blue
as the primary data color, sand as a secondary comparison color, avoid
default multi-color chart palettes (the rainbow-chart look is a strong
generic-template tell). Include a Website vs. WhatsApp Direct channel
comparison as a simple, elegant split-bar rather than a busy multi-series
chart.
```

### 3.13 Admin Dashboard — Customers / CRM

```
Design the customer list/CRM view. Each customer row shows name, phone,
total orders, total spent, and CRM tags (e.g. "repeat buyer," "VIP")
styled as small understated text tags in the sand accent color — not
loud colored badges. Clicking into a customer shows their full order
history as a simple vertical list (reusing the order-status visual
language from Section 3.9) plus their conversation history, giving staff
full context in one place without a cluttered, over-decorated profile
layout.
```

---

## 4. Workflow Tips to Keep It Human

- **Generate one screen, then stop and adjust before generating the next.** Figma AI tools tend to lock into a pattern after the first screen and repeat it — if screen 1 has a subtle AI tell (a gradient, a default rounded card), it will propagate to every screen after it unless you correct it first.
- **After generation, manually vary the corner radii, spacing, and shadow treatment across components.** Uniformity across every single card/button is the single biggest giveaway of AI-generated UI — real designers vary these deliberately.
- **Swap any default-feeling headline font immediately.** If the output defaults to Inter/Poppins/Montserrat for headlines despite the brief, replace it by hand — this one fix does more for "human-designed" perception than almost anything else.
- **Re-crop or re-select at least one image per screen to break perfect centering.** Editorial fashion sites almost never center-crop every image identically.
- **Deliberately break your own grid once per screen**, even if the AI output is grid-perfect — offset one element, let one image bleed past its column, vary one card's size.
- **Check your CTA buttons for shape monotony.** If every button across the whole file is the same pill shape and size, manually differentiate primary vs. secondary vs. tag/chip buttons.
- **Compare side-by-side against the Section 2 references before calling a screen done** — if it looks more like a generic SaaS template than like Rouje/Doen/Glossier, it needs another pass.