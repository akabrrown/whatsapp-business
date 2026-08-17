---
name: accessibility-chaos-testing
description: Use whenever building or reviewing any UI, before calling a screen "done," or when testing a feature's edge cases. Treats accessibility as a set of chaos scenarios to actively try to break — keyboard-only navigation, screen reader announcement, zoom/reflow, reduced motion — rather than a static checklist reviewed after the fact. Trigger on any new screen, component, form, or modal, and pair with defensive-coding's chaos-scenario habit.
---

# Accessibility chaos testing

Prime rule: accessibility bugs are the same category as the other bugs
this system catches — they just aren't caught by clicking through the
happy path with a mouse. Treat "can a keyboard-only user complete this
flow" the same way defensive-coding treats "can a user pay twice" —
as a scenario you actively try to break, not a checkbox you tick.

## Chaos scenarios to actually run, not just imagine

1. **Unplug the mouse.** Tab through the entire flow start to finish.
   Every interactive element reachable, in a logical order, with a
   visible focus indicator at every stop. Can you open a modal, operate
   everything inside it, and close it without ever touching a pointer?
2. **Close your eyes and use a screen reader.** Turn on VoiceOver/
   NVDA/TalkBack and complete the flow by sound alone. Does every image
   have alt text that describes function, not "image1.png"? Does every
   form input announce its label, not just show placeholder text that
   disappears on focus? Does a live region announce dynamic changes
   (an error appearing, a cart total updating) or does the screen reader
   user just... not find out?
3. **Zoom to 200% and reflow to 320px width.** Does content reflow into
   a single column without horizontal scroll, overlapping text, or
   clipped controls? This is also the mobile-narrow-viewport test.
4. **Turn on reduced-motion.** Every animation from the ui-ux-design
   skill's motion table must respect `prefers-reduced-motion` — parallax,
   staggered fade-ins, and scale-on-hover all need a static fallback,
   not just a slower version.
5. **Trigger every error state with only a keyboard, and listen for it.**
   Form validation errors: does focus move to the first invalid field?
   Does a screen reader actually announce the error, or does it silently
   appear as red text a sighted mouse user would notice but a screen
   reader user would miss entirely?
6. **Try it one-handed on a phone, thumb only, no zoom.** Touch targets
   ≥44×44px, primary actions reachable in the bottom thumb zone (ties to
   ui-ux-design's mobile section) — verify this by actually holding the
   phone one-handed, not by measuring in devtools.
7. **Simulate a slow connection and interrupt it mid-load.** Does a
   screen reader user get told content is loading, or does a silent gap
   read as the page being broken? (Ties to defensive-coding's network-
   resilience chaos scenarios — this is the accessibility angle on the
   same failure mode.)

## Common failures this catches that a static checklist misses

- A modal that traps focus visually but not for the tab key — keyboard
  users tab "through" the modal into content behind it.
- A color-only status indicator (red dot = error) with no icon, label,
  or pattern backup — invisible to colorblind users and unannounced to
  screen readers.
- A custom dropdown/select built from `div`s with `onClick` handlers and
  no `role`, no keyboard support, no announcement of the selected value.
- Skeleton loading states with no `aria-busy` or live-region announcement
  — a screen reader user hits silence with no indication anything is
  happening.
- Icon-only buttons with no accessible name (`<button><svg/></button>`
  with nothing else) — a screen reader announces "button" and nothing
  else.
- Heading levels chosen for visual size instead of document structure
  (an `h4` used because it "looks right" where an `h2` belongs) —
  breaks screen reader users' ability to navigate by heading outline.

## Baseline (non-negotiable, from the design skill — reinforced here)

Real semantic elements and heading order, never div soup styled to look
like structure. Visible focus states on every interactive element,
never removed for aesthetics. Color never the only signal. Touch targets
≥44px. Alt text describing function or content, never a filename.
Contrast ≥4.5:1 body text, ≥3:1 large text (WCAG AA minimum).

## Report format

`[SEVERITY] component/screen — chaos scenario that broke it — what a
real user experiences — the fix`. Severity: critical (flow cannot be
completed at all by an affected user) / high (completable but
significantly harder or confusing) / minor (works but not ideal).

## Commands

`/a11y-chaos [screen/flow]` — run all seven chaos scenarios above
against the named screen or flow, report failures with severity.
`/a11y-audit` — static WCAG 2.1 AA sweep (semantic structure, contrast,
labels, focus order) without the live chaos-scenario walkthrough.
