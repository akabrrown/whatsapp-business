---
name: ui-ux-design
description: Use whenever designing or building a new screen, page, landing page, component, or visual layout — before writing markup or styling — for any website or mobile app. Produces unique, non-templated, user-friendly designs with exact spacing/color/motion specs, and a retention layer so users want to come back. Trigger on "design," "build a page/screen/component," "make this look better," "make it unique," or any new UI work.
---

# UI/UX design master — unique, user-friendly, habit-forming

Prime directive: design like a studio hired specifically because past
clients rejected templated proposals. Skeptic test: would a working
designer, shown only a screenshot with no context, guess this was
AI-generated? If yes, even a little, revise. A second test matters just
as much here: would a user willingly come back tomorrow because of how
this felt to use, not just what it did?

## Core philosophy

Design for humans first, metrics second — every element earns its
place. Clarity over cleverness: if a user hesitates for a second, the
design has failed. Familiar patterns, unexpected execution — users
should feel at home, never bored. Speed is a feature; perceived
performance matters as much as actual performance. Accessibility is the
foundation, not a checklist — design for screen readers, keyboards, and
motor-impaired users from minute one (pair with the
`accessibility-chaos-testing` skill). Mobile is not a shrunken desktop —
design thumb-first, then expand up.

## Ground it first

Before touching color or type, state explicitly: what this specific
product/page actually is (not a generic category), who actually uses it
in what real situation, and the one job this screen has to do. Build
every layout/copy decision from real content — never lorem ipsum.

## The differentiator check — run before finalizing any screen

1. What two things does no competitor in this space do?
2. What would make a user screenshot this and show a friend?
3. If the logo were removed, would users still recognize the brand?

If all three come up empty, the screen is still generic — revise before
shipping.

## Forbidden patterns — never use

Purple-to-blue gradient heroes with 3D blob illustrations · 3-column
feature cards with icons and checkmark lists · "Trusted by [logo soup]"
bands · generic star-rating testimonial carousels · glassmorphism with
blurred backgrounds · pill-shaped gradient CTA buttons · perfectly
symmetrical, centered-everything layouts · vague copy ("unlock your
potential," "transform your workflow") · lorem ipsum or `[Company Name]`
placeholders · AI-chat-style instant replies with emojis · floating 3D
illustrations or generic vector characters · icon-tile feature grids ×6
· bento grids used as decoration rather than driven by real content
hierarchy · invented stats bars ("10,000+ users").

None of the three cliché zones below are banned outright — a brief might
genuinely call for one — but never land on one by default: warm cream +
high-contrast serif + terracotta accent · near-black + one acid-green/
vermilion accent ("modern dark mode") · broadsheet layout with hairline
rules and zero radius.

## Color system

One accent color only, on a black/white/neutral base — no multi-accent
rainbows. Accent is reserved for primary actions, active states, data
visualization, and success indicators — never decoration. Dark mode
default where the product allows it; true black (`#000000`) on OLED
saves battery and reads as premium. No gradients on backgrounds,
buttons, or text — solid fills only. No glassmorphism, no blur, no drop
shadows for elevation — use 1px borders or spacing to create hierarchy
instead. Contrast: body text minimum 4.5:1, large text/UI chrome minimum
3:1 (WCAG AA) — never light gray text on white.

## Typography

Maximum 2 font families per project (one heading, one body). Defaulting
to Inter/Geist/Satoshi untouched is forbidden — customize weight,
spacing, or features, or choose something with actual personality:
monospace for tech/developer tools, high-contrast serif for editorial,
bold grotesque for creative/agency, clean geometric sans with real
personality for productivity/SaaS. Headings viewport-scaled with
`clamp()` so type carries visual weight instead of decoration. Body
16px minimum, line-height 1.5–1.7. Captions 12–14px, never below 12px.
Line length 60–75 characters for body text. Letter-spacing zero or
positive only — never negative tracking. Two weights only (regular +
medium) — avoid piling on 600/700 everywhere. Real content drives
layout; if content doesn't exist yet, write draft copy that feels real,
never lorem ipsum.

## Layout & spacing

8px base unit — all spacing snaps to 4/8/12/16/20/24/32/48/64/80/120px,
no arbitrary values like 7px or 13px. Macro white space between
sections: 80–120px desktop, 48–64px mobile. Asymmetric bento grids for
feature sections (60/40, 70/30 splits, never equal thirds) — let content
dictate the grid, not the reverse. Broken grids or organic layouts for
editorial/creative pages. Intentional asymmetry: offset images,
staggered text, overlapping layers. No perfectly centered 3-column
grids, ever.

**Elevation & borders:** 1px solid borders to separate elements, not
shadows. Radius scale — 4px chips, 8px buttons, 10px cards/inputs, 12px
panels, full for pills/avatars. Nested radius rule: inner radius must be
smaller than the outer (`inner = outer − padding`).

## Components

**Buttons** — sharp rectangles (2–4px radius) or fully circular, never
pill-shaped. Solid fill, no gradients. Hover: subtle scale (1.02x) +
slight color shift. Loading state disables the button and shows inline
progress — never leave it clickable during an async op. Destructive
actions (delete, remove) hover-revealed, not permanently visible.

**Cards** — 1px solid border, no shadow, no blur. Padding 16–24px.
Content-first, never decorative. Real data, real images, real copy.

**Forms** — labels above inputs, never inside (floating labels confuse
users). Inline validation on blur, not every keystroke. Specific,
actionable errors ("Email must contain @," not "Invalid input").
Preserve user input on error — never clear the form. Loading state on
submit + disabled inputs while pending.

**Navigation** — desktop: horizontal top nav OR vertical sidebar, never
both. Mobile: bottom tabs for primary wayfinding, hamburger only for
secondary. Active state visually distinct by weight, color, or
underline — never just a tint.

**Empty states** — every list, table, dashboard needs a designed one:
friendly illustration/icon, explanatory text, a primary action ("Create
your first project"). Never "No data" or a blank screen.

**Error states** — every async operation needs one: what went wrong +
how to fix it + a retry action. Never a raw error code or "Something
went wrong."

## Motion & micro-interactions

Every animation informs, directs, or delights — never decorates. CSS
transforms and opacity only (GPU-accelerated), no layout-triggering
animation. Respect `prefers-reduced-motion` without exception. Durations
150–300ms; ease-out for entrances, ease-in for exits.

**Patterns:** page load → staggered bottom-up fade-in, 50–100ms stagger
· button hover → scale 1.02x + color shift, 150ms · form error → subtle
shake (±4px translateX, 200ms) + red border · success → a brief
checkmark animation, then settle · skeleton screens for loading content,
never a spinner on a full page.

**Forbidden:** bouncing buttons · parallax across an entire page (max
1–2 key images) · heavy WebGL/3D on basic content pages · infinite
looping animations that distract from content.

## Mobile-first rules

Touch targets ≥48×48dp (Android) / 44×44px (iOS), spaced ≥8px apart.
Primary actions in the bottom 25% of the screen — the thumb zone.
Bottom navigation over hamburger menus for primary wayfinding. Swipe
gestures for secondary actions (delete, archive, dismiss). Bottom sheets
dismissible by swipe-down or tap-outside. Respect iOS back-swipe and
Android system navigation gestures; customize Material/iOS components,
never ship defaults untouched. Contextual permission requests only —
never request camera/location/notifications on first launch. Inputs
full-width, 16px padding, 48px minimum height. No hover-dependent
interactions on mobile (no hover-reveal). Every screen needs a designed
offline state; handle slow networks with skeletons and progressive
loading, and if a user taps during a pending request, queue the action
or show inline status rather than silently ignoring the tap.

## Web-specific rules

Breakpoints: mobile <640px, tablet 640–1024px, desktop >1024px — design
mobile-first, then expand; never shrink a desktop layout to fit mobile.
Images WebP/AVIF, lazy-loaded, responsive `srcset`. Fonts:
`font-display: swap`, subsetted, preload only critical weights. Always
reserve space for images/ads/dynamic content — zero layout shift. First
Contentful Paint target <1.5s on 3G.

**SEO & machine experience:** semantic HTML, proper H1–H6 nesting, one
H1 per page. Structured data (Schema.org/JSON-LD) on key pages. Accurate
ARIA labels on every interactive element. DOM order matches visual
reading order — if it doesn't, that's a bug, not a style choice.

## Anti-stock imagery

Candid photography (real people, real environments, imperfect lighting)
over stock. Hand-drawn marks and rough edges where a human touch helps.
One icon family throughout, customized stroke/corner radius, or 3–5
custom icons for primary actions. ASCII/code motifs only where earned
(tech brands).

## Retention & delight — the "come back" layer

This is the section that actually answers "make users want to return."
Speed and clarity get someone through a task once; these factors are
what make them choose the product again tomorrow without being asked to.

1. **Progress visualization** — show how far the user has come
   (onboarding, courses, fitness, savings). Humans are completionists;
   an unfinished progress bar pulls people back.
2. **Personalized empty states and greetings** — "Good morning, Kwame.
   You have 3 tasks waiting," never a generic "Welcome back."
3. **Micro-rewards** — subtle celebration on milestones: a brief
   animation, a satisfying sound, a checkmark flourish. Not gamification
   bloat — restraint is what keeps it feeling earned, not gimmicky.
4. **Speed of repetition** — the second visit must be faster than the
   first. Remember preferences, pre-fill known data, skip onboarding
   already completed.
5. **Anticipatory design** — surface what the user likely wants next
   based on context (time of day, last action, location) rather than
   making them navigate to find it.
6. **Deliberate friction for important actions** — a real confirmation
   step on destructive or high-stakes actions builds trust, and trust is
   what retention is actually built on. Removing friction everywhere
   erodes that.
7. **Consistent personality** — same tone, same motion rhythm, same
   kind of surprise every time. A product that feels like a different
   character each visit doesn't build the familiarity that brings people
   back.

**The screenshot moment:** every product needs 1–2 screens users
actually want to share — a beautiful data visualization, a satisfying
completion state, a clever empty state with real personality, a
shareable summary or report. Design at least one on purpose; don't leave
it to chance.

## Content & copy

Sentence case everywhere, never Title Case or ALL CAPS. Active, second
person voice ("You saved $50," not "$50 was saved"). Specific over
vague ("Your report is ready," not "Action completed successfully"). No
mid-sentence bolding — use code style for technical terms, not bold.

**CTAs:** action-oriented ("Save changes," "Start free trial," "Send
message"), never "Submit," "Click here," "Learn more," or "OK." Primary
CTA gets the accent color; secondary is outlined or text-only. Max 2
CTAs per section.

**Microcopy:** loading → "Saving your work...", not "Loading...".
Success → "Profile updated", not "Success". Error → "We couldn't save
your changes. Try again.", not "Error 500". Empty → "No orders yet.
Browse our collection.", not "No data".

## The machine experience layer (MX)

Design serves two audiences at once. Humans need clear hierarchy, fast
load, accessible contrast, readable content. AI agents (search crawlers,
assistants reading the page on a user's behalf) need semantic HTML,
structured data, accurate ARIA labels, and quotable passages with clear
topic sentences. If visual order and DOM order diverge, that's a bug.

## Accessibility baseline — non-negotiable

Real semantic elements and heading order, never div soup styled to look
like structure. Visible focus states on every interactive element,
never removed for aesthetics. Color never the only signal — pair with
icon, label, or pattern. Touch targets ≥44px. Alt text describing
function or content, never a filename. For the deeper active-testing
pass (keyboard-only walkthrough, screen reader pass, reflow at 320px),
use the `accessibility-chaos-testing` skill.

## Two-pass process

**Pass 1 — plan:** a token system (4–6 named hex values with usage
rules, two typefaces with explicit roles, a layout concept plus ASCII
wireframe, one signature detail) before any code.

**Pass 2 — critique:** "if I ran a similar brief through this process,
would I land here again?" Revise anything generic, then build to the
revised plan exactly — no improvising outside the token system.

## The three rules of non-generic design

1. Constrain the palette — one accent plus neutrals beats five gradients.
2. Let content drive layout — asymmetry and white space signal intention.
3. Add one human imperfection — a hand-drawn mark, a candid photo, an
   unexpected type choice. This is what a template can't replicate.

## Final checklist before shipping any screen

No placeholder text anywhere · no generic AI-template patterns (3-card
grids, gradient heroes, logo soup) · real content in all mockups and
production · loading state for every async operation · empty state for
every list/dashboard · error state with an actionable message for every
form/API call · dark mode intentionally designed, not just inverted ·
mobile layout verified (thumb zones, touch targets, text size) ·
accessibility: keyboard navigable, screen-reader friendly, 4.5:1
contrast · motion respects `prefers-reduced-motion` · favicon, OG image,
meta description set · no dead links or `#` hrefs · at least one
screenshot moment designed · passes the remove-the-logo test — still
recognizable as the brand.

> "The best UI is the one the user doesn't notice — until it's gone.
> Design for flow, not flash." Every decision should answer: does this
> help the user accomplish their goal faster, more confidently, or more
> enjoyably? If not, remove it.

## Commands

`/design-plan [subject]` — Pass 1 only: token system, wireframe, signature detail.
`/design-critique` — Pass 2 self-check against the last plan or build.
`/design-build` — build the approved plan.
`/design-fingerprint` — audit an existing screen against the cliché zones and forbidden patterns.
`/retention-check [screen/flow]` — audit against the seven "come back" factors and confirm a screenshot moment exists somewhere in the product.
