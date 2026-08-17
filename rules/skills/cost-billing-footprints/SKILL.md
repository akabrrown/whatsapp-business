---
name: cost-billing-footprints
description: Use whenever writing code that calls a paid third-party API, runs a database query, provisions cloud infrastructure, sets up a cron job/background worker, or handles file storage/bandwidth. Catches patterns that technically "work" in a demo but silently rack up cost at real usage — unbounded loops, missing caching, no query limits, unthrottled retries, oversized media. Trigger on any integration with a metered service (LLM APIs, SMS/email providers, cloud storage, payment processors) or any code that runs on a schedule or at scale.
---

# Cost & billing footprints

Prime rule: code that works correctly but costs 50x what it should is
still a bug — it just doesn't show up until the invoice arrives. Review
every metered dependency the same way you'd review a security boundary:
assume it will be hit harder than the happy-path demo suggests.

## Unbounded operations

- Loops that call a metered API per iteration with no batching (sending
  100 individual emails instead of one batch call, one LLM call per row
  in a CSV instead of a single batched prompt where the provider
  supports it).
- No pagination limit on a query that could return an unbounded result
  set — `SELECT *` with no `LIMIT`, a "load all" admin export with no
  size cap, a recursive function with no depth guard.
- A retry loop with no backoff and no max-attempt cap — a flaky
  downstream service turns into an unbounded request storm that gets
  billed per call.
- Webhook handlers or background workers with no rate limit on how
  often they can fire, so a misbehaving upstream (or an attacker)
  can trigger unlimited billable work.

## Missing caching where it's cheap to add

- Repeated identical calls to a metered API within the same request or
  session with no memoization — computing the same expensive result
  (a geocode lookup, an LLM completion for static content, an exchange-
  rate conversion) multiple times when once would do.
- No CDN/edge caching on static or rarely-changing assets, so every
  request round-trips to origin storage and re-incurs bandwidth cost.
- Cache invalidation missing entirely (defensive, "just always refetch")
  as an overcorrection — this trades a subtle staleness bug for a
  guaranteed cost multiplier; get invalidation right instead of avoiding
  caching altogether.

## Storage & bandwidth

- Uploaded media stored and served at original resolution with no
  compression/resizing pipeline — a user-uploaded 12MB photo served
  as-is on every page view.
- No lifecycle/retention policy on object storage — logs, temp uploads,
  and old exports accumulating indefinitely instead of expiring.
- Full database backups or exports triggered more frequently than the
  actual recovery-point objective requires.

## LLM/AI API specifics (directly relevant to your Antigravity-assisted stack)

- Sending full conversation history on every call when only recent
  context is needed — token cost scales with what's sent, not just what
  matters.
- No max-token cap on generation calls, letting a single request run
  unexpectedly long and expensive.
- Using the largest/most expensive model tier for a task a smaller,
  cheaper model handles adequately (classification, simple extraction,
  short-form responses) — reserve the expensive tier for tasks that
  actually need it.
- Client-side code that calls a metered API directly with an exposed
  key — beyond the security risk, this means you have no server-side
  place to enforce a budget or rate limit at all.

## Infrastructure provisioning

- Autoscaling with no upper bound — a traffic spike (real or a bot/
  attack) scales compute without limit and without alerting anyone
  until the bill arrives.
- Dev/staging environments provisioned at production-tier resource
  sizing out of habit rather than actual need.
- Idle resources left running — a database, worker, or compute instance
  spun up for a test and never torn down.

## Required guardrails

Every metered integration gets: a documented expected cost per unit
operation, a hard cap (max results, max tokens, max retries, max
autoscale ceiling) so a bug or attack has a bounded blast radius, and an
alert threshold tied to actual spend, not just error rate — a silent
5x cost increase with zero errors is exactly the failure mode this skill
exists to catch. This pairs directly with the production-engineering
skill's observability section: cost is a metric to alert on, not just
uptime and latency.

## Self-check before shipping anything that touches a paid API or scales automatically

- What's the worst-case cost if this runs 1,000x more often than the
  demo did — is that number known, and is it bounded by a real limit
  in code, not just an assumption about usage?
- Is there a cap on retries, pagination, and autoscaling, or could any
  of them run away unbounded?
- Is anything cached that's being fetched/computed repeatedly for
  identical input?
- Is media stored and served at a size appropriate to where it's shown,
  not the original upload?
- Would a spend spike actually alert someone, or would it only show up
  on next month's invoice?

## Commands

`/cost-audit [feature/integration]` — sweep the named code for
unbounded loops, missing caps, missing caching, and unthrottled retries
against a metered dependency. Report file:line + estimated blast radius.
