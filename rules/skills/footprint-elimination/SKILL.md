---
name: footprint-elimination
description: Use whenever writing, editing, or reviewing code, UI, copy, assets, git commits, or documentation. Removes detectable AI tells — generic identifiers, narration comments, template hero sections, banned vocabulary, gradient/glassmorphism visual clichés, scaffold residue, and uniform commit history — so output reads as hand-crafted by a meticulous human team. Trigger on any file creation/edit, any commit message, any UI component, any marketing/product copy.
---

# Footprint elimination

Skeptic test before delivery: if a senior engineer read this diff, a
designer reviewed this UI, a copywriter read these strings, and a reviewer
scrolled the git log — would any of them suspect AI involvement? No known
AI tell survives.

## Code (web)

NEVER: narration comments restating code · JSDoc on every function by
default · decorative banner comments (`====`, emoji, ASCII art) · generic
identifiers (`data`, `result`, `temp`, `item`, `res`, `handleClick`) — name
for the domain instead · textbook-uniform file/function shapes · one-use
wrapper over-abstraction · emoji in code/comments/logs/commits · rigidly
uniform commit messages · scaffold residue (default README/favicon/demo
routes/unused deps) · X-Powered-By headers · commented-out dead code.

ALWAYS: one formatter run, then leave style natural · domain-specific
identifiers · comments only where they help a future reader · a README
written for this specific project.

## Mobile (React Native / .NET MAUI / Flutter / native)

NEVER: every property on its own line regardless of complexity · every
ViewModel/BLoC shaped identically with copy-pasted method order · generic
starter naming (`MainPage`, `Page1`, `MyModel`, default package/bundle ID)
· default splash/logo left in place · suspiciously exact uniform spacing
(8,8,8,8 everywhere) · stock Material/Cupertino theme with only the accent
swapped · localization files with perfect, drift-free key order.

ALWAYS: custom app icon/splash/store assets · offline states (queued,
syncing, synced, conflict, failed) as first-class UI · platform
conventions respected but not mirrored 1:1 · realistic permission-request
copy, never the OS default string.

## Backend

NEVER: identical try/catch shape copy-pasted regardless of what each
endpoint risks · generic migration names (`Migration1`, `Initial`) ·
placeholder secrets committed instead of a documented `.env.example` ·
default API docs title.

ALWAYS: endpoint naming and errors in this product's real domain
vocabulary · rate limiting/auth/logging tuned per endpoint, not uniform
middleware · seed data that looks real for this domain, never
"Test User 1" / "foo@example.com".

## Design

BANNED: purple-blue gradients, gradient text · glassmorphism, neon glow,
aurora/mesh gradients · untouched shadcn/Tailwind stock theme, "AI blue"
#3B82F6 · the template hero (pill badge + centered headline + gray subline
+ button pair) · icon-tile feature grid ×6 · bento grids, fake logo
marquees, invented stats bars · stock-avatar testimonial walls · 3D blobs,
plastic AI-render illustration · emoji bullets, sparkle icons ·
one border-radius on everything · perfect symmetry everywhere.

REQUIRED: unique design tokens per project, derived from the real brand ·
asymmetric editorial composition · one sparing accent on a neutral
palette · sentence-case, specific headlines · one signature detail per
project a template would never produce.

## Copy

Hard-banned words: unlock, supercharge, elevate, empower, revolutionize,
game-changer, cutting-edge, state-of-the-art, next-level, seamless(ly),
effortless(ly), streamline, leverage (verb), robust, delve, harness,
foster, embark, journey/landscape (metaphor), "in today's fast-paced
world," "look no further," "it's not just X — it's Y," "say goodbye to,"
"the future of X," "reimagine," "transform your."

Hard-banned patterns: em-dash chains (max one per page) · rule-of-three
adjective stacks · Title Case headings · exclamation marks in UI · fake
testimonials/metrics/logos · lorem ipsum anywhere shipped · robot-voice
errors.

Rule: write like the founder explaining the product to one smart friend.
Buttons say what happens ("Send invoice," not "Submit"). Read every
string aloud — if it sounds like a keynote slide, rewrite it.

## Assets & metadata

Custom favicon/app icon always. Designed OG images per key page. Real
title tags and meta descriptions. No generator meta tags. Real photos or
one consistent illustration style — never dicebear/pravatar/ui-avatars.
`manifest.json` / `robots.txt` / `sitemap.xml` filled out for real.

## Git & docs

NEVER: one giant commit with an entire feature fully-formed · commits all
the same size/shape · zero fix-up commits across a multi-week project.

ALWAYS: natural message variation (some terse, some with context) ·
occasional small follow-ups ("typo," "actually fix the thing above") ·
README describing this project's actual setup/env vars/limitations, no
"bootstrapped with..." boilerplate.

## Quick detection reference (any website or app)

**Text/content:** overused words (delve, leverage, unlock, unleash, realm,
embark, tapestry, pivotal, robust, seamless, "fast-paced world,"
"ever-evolving landscape") · sentences of eerily uniform length ·
low "burstiness" (no natural rhythm) · flawless grammar with zero
stylistic breaks · surface-level summary with no original insight ·
the same point restated 2-3 times differently · hallucinated citations
· leftover placeholders (`[Insert company name]`) · unnatural keyword
stuffing · absence of personality, humor, or opinion.

**Visual/design:** purple-to-blue gradients, glassmorphism, neon glow,
abstract 3D blobs · hero → 3 feature cards → testimonials → CTA →
footer · mathematically perfect padding with zero intentional asymmetry
· Inter/Geist/Satoshi used out of the box · stock icon sets
(Lucide/Phosphor/Heroicons) with no customization · gradient/rainbow
text fills on headings · colors/imagery/type that feel assembled rather
than considered.

**Code:** file structure matching a generator's default exactly ·
verbose narration comments ("Increment counter by 1") · identical
Tailwind class ordering repeated everywhere · try/catch that only
`console.error(err)`s · placeholder API keys committed · unnecessary
abstraction/regex for a simple task · missing null checks, loading
states, empty-data handling · deprecated patterns from stale training
data · LLM agent traces or reasoning chains leaking into logs/network
tab.

**Website-specific:** generic cookie banner not matching actual practices
· privacy policy referencing services the site doesn't use · blog H2s
following "Introduction / What is X? / Benefits / Conclusion" · FAQ
schema phrased exactly like search queries · testimonials with no
specific detail · a form with no real backend · social icons linking to
`#` · lorem ipsum in production · chat widget replying instantly with
"I'd be happy to help!"

**Mobile-specific:** 3-slide "Welcome / Discover / Get started"
onboarding · default Material 3 / unstyled `SafeAreaView` / default
`StatusBar` · standard Apple/Google components with zero custom
modifiers · store copy starting every bullet with "Discover,"
"Experience," "Unlock" · gradient-blob app icon · every permission
requested on first launch · default paywall with no custom copy ·
Crashlytics as the only monitoring, no custom events.

**Behavioral/UX:** chatbot replies under 100ms in perfectly formatted
paragraphs · over-apologetic errors ("I apologize for any inconvenience
this may have caused") · predictable Home/About/Services/Blog/Contact
nav with no unconventional labeling · "Recommended for you" that's
obviously generic · real-time validation firing on every keystroke with
overly polite copy · default CSS transitions with no considered motion.

**Metadata/system:** `<meta name="generator">` tags that don't match the
actual stack · C2PA/SynthID signatures in images or text · commit times
clustered unnaturally or identical build dates across pages · one giant
commit or suspiciously perfect conventional-commit formatting
throughout · dozens of unused dependencies included "just in case."

## Commands

`/fingerprint` — audit only, report file:line + severity, change nothing.
`/de-ai [target]` — full removal sweep, re-audit until zero findings.
`/humanize [text]` — rewrite copy in human voice, return only the rewrite.
`/human-check` — design-only audit (gradients, template heroes, fake data).
