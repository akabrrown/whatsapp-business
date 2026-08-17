---
name: growth-retention-strategy
description: Use whenever planning a new feature, product, or app from scratch, choosing a monetization model, designing a notification/streak/reward system, deciding how users will discover the product, or scoping anything with user-generated content or a platform/API strategy. Ensures features are evaluated for growth and retention contribution, not built as isolated functionality. Trigger on "new app idea," "how do we grow this," "monetization," "notification strategy," "user retention," or when planning a product before any code exists.
---

# Growth & retention strategy

AI defaults to building standalone features. Products that actually grow
are built as self-reinforcing loops with an explicit distribution and
retention strategy — decided before code, not bolted on after launch.
This skill governs product/business framing; hand off to
`software-engineering-os` once the strategy is set and it's time to plan
implementation.

## Growth loops, not funnels

A funnel (ad → click → signup → use) is linear and stops. A loop feeds
itself:

- **Viral loop** — user joins, uses product, invites others, they join,
  repeat (Dropbox, Zoom).
- **Content loop** — user creates content, it's discovered, new users
  join, they create content (YouTube, TikTok).
- **Paid loop** — revenue from users funds acquisition, which brings
  more revenue (Uber, Airbnb) — only self-reinforcing if unit economics
  actually work; verify LTV > CAC before treating this as a loop rather
  than a leak.
- **SEO loop** — user-generated content gets indexed, drives organic
  traffic, brings new users who create more content (Pinterest,
  TripAdvisor).
- **Network effect loop** — user joins, connects with others, those
  contacts join, value increases for everyone (WhatsApp, LinkedIn).

When scoping a new feature, ask explicitly: does this feed one of these
loops, or is it a standalone feature with no compounding effect? Both
can be worth building — but know which one you're building.

## AARRR (map every feature to a stage)

Acquisition (cost per install, referral programs) → Activation
(time-to-first-value, onboarding completion) → Retention (D1/D7/D30,
DAU/MAU stickiness) → Referral (K-factor, NPS) → Revenue (ARPU, LTV,
conversion). A feature with no clear stage it improves is a feature
without strategic intent — worth asking about explicitly before
building it.

**K-factor:** invites sent per user × conversion rate of those invites.
`K > 1.0` = viral growth, `K = 1.0` = stable, `K < 1.0` = needs paid
acquisition to grow. Ask whether a proposed feature could plausibly move
this number, not just whether it's a nice addition.

## The cold-start problem

Every network-based product is worthless with zero other users. Real
strategies: single-player value first (useful even alone — Pinterest as
personal bookmarking before social discovery), seed content (Reddit's
early fake accounts), partner/piggyback launch (Airbnb cross-posting to
Craigslist), geographic/segment concentration before wide expansion
(Facebook: Harvard → Ivy League → all colleges), founder/team
evangelism, paid content seeding for creator platforms. Pick a real one
before assuming organic growth will just happen.

## Channel strategy — how will users actually find this?

Organic (SEO, ASO, community, referral, PR — free, slow, scalable) ·
paid (social ads, influencers, affiliates — fast, not scalable) ·
partnerships (API integrations, co-marketing, platform stores — medium
cost, high trust). No product succeeds on "build it and they will come"
— name a real channel mix before launch, and design the product to
support the chosen channel (e.g. ASO needs a genuinely good app-store
listing, an SEO loop needs genuinely crawlable/shareable content).

## Retention architecture

**The Hook Model:** trigger → action → variable reward → investment,
looping back to trigger. External trigger (push, email) fires an
internal one (boredom → open app) over time — that shift from
external to internal trigger is what separates a habit from a
notification-dependent feature.

**Core action loop** — every retained product has one repeated action
(Instagram: scroll feed, WhatsApp: send message, Duolingo: complete
lesson). Identify it explicitly for a new product and optimize that one
loop before spreading effort across many features.

**Notification architecture** — transactional (always send: "your ride
is arriving") vs. engagement (frequency-capped: "3 friends liked your
post") vs. re-engagement (carefully timed: "your streak is about to
break") vs. abandoned-pattern marketing blasts, which should not exist.
Batch non-urgent notifications, respect quiet hours in the user's local
time (not server time), give granular opt-out controls per category —
not just a single on/off switch — and track opt-out rate as a health
metric, not just open rate.

**Streaks and variable rewards** — visual indicator (flame, calendar
grid), daily trigger at the user's actual peak usage time, loss aversion
framing ("about to lose your streak"), a streak-freeze safety valve
(reduces anxiety without eliminating the mechanic), and — critically —
variable rather than fixed rewards, since unpredictability is what
drives repeated engagement (a fixed "every 10th action" reward is far
less effective than a random chance each time). Use restraint here: this
is also exactly the mechanic that turns into a dark pattern if pushed
too far — see the ethics note below.

## Monetization structures

**Freemium tiers** — free (acquisition: core functionality, limited
usage) → premium (conversion: unlimited usage, advanced features, no
ads) → enterprise (expansion: SSO, admin controls, SLA guarantees,
volume pricing). Conversion triggers: usage limits approaching, feature
gates, time-boxed trials, social proof ("join 10M+ Premium users").

**Pricing psychology** — decoy pricing (three tiers so the middle one
feels like the bargain), anchoring (show the annual price first so
monthly looks expensive by comparison), loss-aversion framing ("save
20%" beats "pay 20% more" for the identical math), a genuinely
frictionless free trial (short, no card required).

**Revenue stack** — mature products layer multiple revenue streams
rather than depending on one (Spotify: ad revenue + subscriptions +
family/student tiers + podcast ads + merchandise + B2B data insights).
A single revenue model is a single point of failure — worth naming
which additional streams could exist even if only one launches first.

## Platform & ecosystem thinking (only once product-market fit exists)

Product (single use case) → platform (multiple use cases, network
effects) → ecosystem (third-party developers, API marketplace) →
marketplace (multiple buyers/sellers, platform takes commission). API-
first strategy: build the internal API before the frontend and dogfood
it, then open it externally with real documentation and SDKs, then
consider a marketplace/revenue-share model — in that order, not
simultaneously. This matters even for an internal tool: an API-first
internal architecture is what makes a later external integration
possible without a rewrite.

## Content & community (only if the product has UGC)

**UGC flywheel:** seed content (team/hired creators) → lower creation
barriers (templates, simple tools) → distribution (algorithmic feed,
one-tap sharing) → monetization (creator fund, tips, brand deals) →
retention (follower counts, analytics, recognition badges).

**Moderation — four layers, not one:** automated (hash-matching,
classification models — expect a real false-positive rate) → community
(reporting/flagging, near-zero cost) → human review (appeals, edge
cases — expensive but necessary) → legal/escalation (law enforcement
requests, DMCA, crisis response). A product launching UGC with only
layer 1 will not hold up. Publish moderation guidelines and allow
appeals — transparency is itself a retention factor for a community
product.

**Network effects** — direct (more users = more value, WhatsApp),
indirect/cross-side (more buyers → more sellers → more buyers, Uber/
Airbnb), data (more usage → better product → more usage, Netflix
recommendations), platform (more developers → more apps → more users).
For cross-side markets, seed the scarcer side first and consider
subsidizing it early (PayPal's original $10-to-join).

## Missing from the source material, added

**North Star Metric** — a single metric the whole team optimizes toward
that reflects real user value delivered (not vanity metrics like raw
signups) — e.g. Airbnb's "nights booked," Spotify's "time spent
listening." Choose one explicitly for a new product; it disciplines
which of the above loops actually matter to build first.

**Jobs-to-be-Done framing** — before building a growth mechanic, name
the job the user is "hiring" the product to do. A streak mechanic
retains users only if it reinforces a job they actually wanted done —
bolting gamification onto a product that solves no real job just adds
friction.

**Sean Ellis / 40% test for product-market fit** — before investing
heavily in growth loops, check: would ≥40% of current users be "very
disappointed" if the product disappeared? Below that threshold, growth
investment usually means acquiring users who will churn anyway —
retention work comes first.

**RICE / ICE prioritization** — when multiple growth ideas compete for
build time, score by Reach × Impact × Confidence ÷ Effort (or the
simpler ICE: Impact, Confidence, Ease) rather than building whichever
idea is loudest in the room.

## Ethics guardrail

Every mechanic in this skill (streaks, variable rewards, urgency
framing, loss aversion) has a legitimate, retention-healthy version and
a manipulative dark-pattern version. The line: does the mechanic help
the user get more value from something they actually want, or does it
exploit a cognitive bias to extract engagement/spend they wouldn't
choose with a clear head? If a proposed mechanic only works because
it's manipulative, flag it rather than implement it as-is — this ties
directly to the consent-pattern rules in `legal-compliance-copy`.

## Commands

`/growth-review [feature]` — map the feature to an AARRR stage and a
named growth loop; flag if it has neither.
`/monetization-plan [product]` — propose a freemium/pricing structure
with named conversion triggers.
