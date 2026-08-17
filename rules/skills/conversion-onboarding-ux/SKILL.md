---
name: conversion-onboarding-ux
description: Use whenever designing onboarding flows, sign-up/login screens, empty states, notification permission requests, personalization features, or a marketing/landing page meant to convert. Covers the psychological and behavioral layer of UX — time-to-first-value, risk-based authentication friction, haptic feedback, and conversion-page structure — that a visual design pass alone doesn't address. Trigger on "onboarding," "sign up flow," "landing page," "hero section," "empty state," or "how do we get users to convert/stick around." Pairs with `ui-ux-design` for the visual execution and `growth-retention-strategy` for the business framing.
---

# Conversion, onboarding & behavioral UX

Visual design (`ui-ux-design`) makes a screen look right. This skill
makes the *sequence of screens* actually convert and retain — the
psychology of the first 60 seconds, the friction budget on auth, and
the behavioral triggers that bring someone back tomorrow.

## Onboarding — the first 60 seconds

Reaching real value within roughly 60 seconds materially changes
early retention; users who don't hit an "aha moment" quickly are
disproportionately unlikely to return. The lever that matters most:

- **Delay registration until value is proven.** Let the user browse,
  interact, or complete one meaningful action before asking for email/
  password — not a 3-slide illustrated carousel ending in "Get
  Started." (Duolingo: complete lesson 1 before account creation.
  Headspace: meditation starts immediately, account creation deferred.)
- **Show, don't tell.** One or two frictionless value-preview screens,
  not a multi-slide tutorial nobody reads.
  Contextual tooltips shown when the user reaches a feature, not
  front-loaded before they need them.
- **Prime permissions just-in-time.** Request camera access when the
  user taps "take photo," not on first launch. Requesting everything
  upfront measurably increases denial rates.
  requests upfront.
- **Two personalization questions maximum** during signup — enough to
  tailor the initial experience, not so many it feels like a form.
- **Never end onboarding on an empty screen.** Land the user somewhere
  with real content or a clear first action, not a blank state.

**Adaptive onboarding** — a single fixed flow for every user is a
missed signal. Detect sophistication in the first few interactions (tap
speed, navigation confidence, whether they came from a competitor) and
branch: fast/minimal for tech-savvy users, differentiator-focused for
switchers, full guided tour for genuine beginners, "resume where you
left off" for returning users.

## Frictionless, risk-appropriate authentication

Uniform friction (email + password + confirm + CAPTCHA for everyone,
always) is the AI default. Real products apply friction proportional to
actual risk:

- **Low risk** (known device, recognized location, typical behavior,
  recent auth) → no additional MFA.
- **Medium risk** (new device but known location, unusual time) → soft
  MFA (push-notification approval).
- **High risk** (new device + new location, impossible-travel pattern,
  repeated failed attempts) → hard MFA (biometric + code).

**MFA method choice affects completion rate materially** — biometric
(Face ID/Touch ID) has by far the lowest abandonment, followed by push
approval, TOTP apps, SMS codes, and email codes in roughly that order.
Default to the least-friction method the risk level actually allows,
not the easiest one to implement.

**Social sign-in progression:** "Continue with Google" as the primary
option, "or use email" as a smaller secondary path, and — where it
fits the product — a magic-link email flow as the zero-password
option. Never make password-based signup the only path if a lower-
friction alternative is viable for the product's trust model.

## Micro-interactions & perceived performance

Users judge *perceived* speed, not just actual load time — a skeleton
screen reads as meaningfully faster than a spinner even at identical
load time (ties to `ui-ux-design`'s motion rules; this is the
psychological reasoning behind that rule). Every micro-interaction has
four parts: trigger → rules → feedback → loop/mode. Design the feedback
step deliberately rather than leaving it as a default transition.

**Mobile haptic feedback** (used sparingly, reserved for meaningful
moments, never the sole signal for anything — pair with a visual state
for accessibility): light impact on button press, a distinct success
buzz on completion, an error buzz paired with a subtle shake and red
border on failure, a selection-changed tick on toggles. Honor system
haptic settings; never force haptics a user has disabled at the OS
level.

## The empty state formula

Every empty state needs: a visual matching the actual emotional context
(not a generic icon), a specific friendly headline ("No orders yet," not
"Empty"), body copy explaining why it's empty and what to do next, a
primary CTA that fills the state, and optionally a secondary/alternative
action. Empty states can evolve with usage — a first-session empty state
("Tap + to create your first note") differs from a session-7 empty
state that can teach a power feature instead of repeating onboarding
copy.

## Personalization that feels earned, not creepy

Generic "recommended for you" with no stated reason reads as arbitrary
and untrustworthy. Every personalized surface should be explainable in
one line: "Because you liked X," "Trending in your area," "Based on
your reading history." Time-based, location-based, and behavior-based
personalization all work better when the *reason* is visible — this is
also a legitimate transparency practice, not just a conversion tactic,
and ties directly to the consent/transparency expectations in
`legal-compliance-copy`.

## Navigation & cognitive load

Progressive disclosure: always-visible (search, primary nav, main CTA)
→ one-tap-away (filters, secondary actions) → contextual (advanced
settings) → deliberately hidden (danger zone, dev options). Don't
surface everything at once by default. Smart defaults over "choose your
preference" prompts for things like notification frequency, theme
(system preference with override), currency/language (geo/device-
detected with easy override) — asking the user to configure everything
manually before they've seen any value is friction with no payoff.

## Error recovery that builds trust

Every error needs: what happened (specific, not "Error 500"), why it
happened in plain language, how to fix it (an actionable next step), an
escape hatch (an alternative path forward), and a real path to human
support if needed — not just a help-center link. Destructive actions
get an undo window (a 5-second toast, an inline "Removed. Undo?"), not
an immediate irreversible action. This is the UX expression of the
recovery-action rule already in `ui-ux-design`'s error-state
component spec — this section is the reasoning and the fuller formula
behind it.

## Accessibility as a retention lever, not just compliance

Beyond the WCAG baseline already covered in `accessibility-chaos-
testing`: dynamic type support up to significantly larger system font
sizes, voice-control coverage for core actions, consistent and
predictable layouts (valuable for neurodivergent users specifically,
not just screen-reader users), and genuinely reduced-motion support.
Accessible products see materially better retention among older users
and anyone using the product in a non-ideal context (bright sunlight,
one-handed, temporary injury) — treating this as a retention investment
rather than only a compliance checkbox changes how much effort it's
worth spending.

## Conversion-first web design

**Hero formula that actually converts:** a specific value proposition
(10-15 words, a real claim not a vague aspiration), a compelling
subheadline with a concrete number or outcome, social proof with real
context (not a logo wall nobody reads), and a single benefit-focused
primary CTA ("Get my free audit," not "Submit").

**Carousels hurt conversion** — engagement with slides beyond the first
is very low, movement distracts from message comprehension, and
sliders slow page load. If there are three important messages, that's
three focused landing pages or sections, not one carousel cramming them
together.

**Trust-first elements:** real testimonials with specific context (not
generic praise), transparent pricing/process, privacy reassurance near
forms, honest FAQs addressing real objections, clear data-usage
messaging.

**Speed is a conversion factor, not just a performance metric** —
mobile users abandon slow-loading sites at a high rate within the first
few seconds; every increment of latency measurably costs conversion.
This is the business case behind the performance budgets already in
`ui-ux-design` and `production-engineering`.

**Mobile-first conversion details:** numeric keypad triggered for phone
fields, email keyboard for email fields, smart autofill, one-tap
payment options (Apple Pay/Google Pay) where applicable, single-column
layout, inline validation (not only after submit), full-width sticky
CTAs on small screens.

## Commands

`/onboarding-review [flow]` — check against the TTFV/value-before-signup
rules above, flag any account wall before value is proven.
`/conversion-review [page]` — check hero formula, CTA specificity, and
carousel/trust-signal presence against this skill.
