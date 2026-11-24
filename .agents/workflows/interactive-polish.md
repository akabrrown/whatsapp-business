# Workflow: /interactive-polish
# Description: Transform any web page, screen, dashboard, or component into an interactive, tactile, high-delight experience tailored to its archetype.

stages:
  - id: 1-archetype-detection
    name: Detect Website & Screen Archetype
    action: |
      Inspect the target route, component, and user intent.
      Classify into one of 5 interaction archetypes:
      - SaaS / Productivity (Linear-feel, Cmd+K, 0ms optimistic lists)
      - Fintech / Banking (Tactile numbers, rolling tickers, security morphs)
      - Dashboard / Data Density (Sparklines, fluid chart scaling, drawers)
      - EdTech / Gamified Community (Confetti, streaks, flashcard flips)
      - Editorial / Spatial / Commerce (Runway depth stacking, bento spotlights)

  - id: 2-interaction-recipe-injection
    name: Inject Motion & Interactive Components
    action: |
      Read `creative-motion-engine` and `domain-interaction-recipes`.
      Apply calibrated spring physics (stiffness, damping, mass).
      Ensure touch-down scales (scale: 0.96-0.98) on all interactive buttons.
      Implement layout animations (layoutId) for sliding tabs or expandable cards.

  - id: 3-guardrails-audit
    name: Audit Against Interactive Design Guardrails
    action: |
      Verify against `interactive-design-guardrails.md`:
      - 100% GPU-only properties animated (transform, opacity). Zero top/width/height reflow animations.
      - Full @media (prefers-reduced-motion: reduce) accessibility fallback.
      - Actions, forms, and checkouts execute immediately without artificial delays.
      - Mobile touch targets >= 44x44px with zero horizontal layout shift.

  - id: 4-verification-and-release
    name: Verify 60fps & Build Integrity
    action: |
      Run TypeScript type-check: `npx tsc --noEmit`.
      Run Next.js build: `npm run build`.
      Confirm zero console warnings or layout thrashing.
