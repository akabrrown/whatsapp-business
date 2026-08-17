---
name: quota-efficient-execution
description: Use as an ongoing discipline during every real project session — not just when explicitly asked. Treats usage quota as a finite budget for the whole session/project, not just a per-task efficiency concern. Flags expensive operations before running them, defaults to conservative spend, and lets the person set a budget mode. Trigger on every task in a project session, especially long multi-file builds, repeated iterations, or any session where quota lasting the full project matters.
---

# Quota-efficient execution — treat usage as a budget, not an afterthought

Being efficient on a single task and making a subscription's quota
actually last through a multi-week project are related but different
goals. This skill is about the second one: spend deliberately across
the whole session/project, not just avoid obvious waste task by task.

**Honest limitation up front:** this skill cannot see your actual
remaining quota — Antigravity doesn't expose that to the agent. What it
can do is control the *rate* of spend through the behaviors below. For
the real number, check Antigravity's own usage indicator (Settings →
Usage, or wherever your plan surfaces it) — that's the ground truth,
this skill is the lever.

## Set a budget mode for the session

At the start of a session (or a new project), the person can declare
one of three modes, and it should hold for the rest of the session
unless changed:

- **Light** — minimum viable correctness. Fix/build exactly what was
  asked, verify the critical path only, skip optional audits and
  secondary-skill sweeps entirely unless something looks actually wrong.
  Best for stretching quota across a long project or late in a billing
  cycle.
- **Standard** (default if nothing is declared) — the normal discipline
  in this skill: right-sized ceremony, batched calls, targeted edits,
  audits only when asked.
- **Thorough** — full rigor from every relevant skill, audits run
  proactively, nothing deferred. Best reserved for final pre-ship work
  or genuinely high-stakes features (payments, auth, data migrations),
  not routine iteration.

If the person hasn't stated a mode and quota is a known concern, default
toward Light rather than Standard — it's cheaper to ask for more rigor
on a specific piece than to have spent broadly by default.

## Flag the cost of optional work before doing it

Before any operation that's expensive AND optional — a `/full-audit`,
running four specialist skills on one screen, generating multiple
alternative approaches to compare, a broad exploratory search across an
unfamiliar codebase — say what it will cost in scope ("this touches
6 skills across the whole project") and confirm it's wanted, rather than
just doing it. Work that's expensive but non-optional (verifying a
payment flow actually works, checking auth on every endpoint before
calling a feature secure) doesn't get this gate — correctness isn't
optional regardless of mode; only the *extra*, *nice-to-have* thoroughness
is.

## Where quota actually goes

Every tool call (file read, search, bash command, tool round-trip),
every large context load (re-reading a big file, re-loading skill
content already established this session), and every retry/regeneration
cycle costs usage. The three biggest avoidable drains across a project:
**re-reading things already known**, **regenerating whole files for a
small change**, and **running broad/optional sweeps that weren't
actually requested**.

## Match ceremony to task size

Not every task needs the full `software-engineering-os` plan-then-build
sequence. A one-line bug fix, a copy tweak, a config value — just do it,
verify it, report it. Reserve the full requirement-analysis →
phased-plan → build → verify cycle for genuinely non-trivial work (new
feature, new screen, schema change, anything touching auth/payments/
data). Default to the lighter tier when unsure; escalating later is
cheaper than having over-invested up front.

## Batch instead of round-tripping

Combine related actions into fewer tool calls: read related files in
one pass, make related edits in one pass instead of edit-check-edit-
check individually, run independent checks together instead of
serially. A task that could be five thoughtful tool calls shouldn't
become fifteen because each was decided one at a time.

## Don't re-read or re-establish what's already known

If a file's content is already visible earlier in the session and
hasn't changed since, don't re-view it before editing. Re-view only when
it may have changed outside this session, a prior edit might have
shifted surrounding lines, or real staleness risk exists. Same for
skills: once a rule has been established and applied earlier in the
session, apply it silently on later turns instead of restating it.

## Prefer targeted edits over full regeneration

A one-function change is one `str_replace`, not a full-file rewrite.
Regenerating a whole file for a few changed lines costs the tokens for
the whole file and risks unrelated diffs — this also aligns with
`software-engineering-os`'s minimal-change principle, so getting this
right serves both goals at once.

## Chunk large builds with real checkpoints

For a genuinely large build, treat the phased plan from
`software-engineering-os` as a spend checkpoint, not just an engineering
one: build and verify one phase, confirm it's actually right, then move
on — rather than generating an entire application in one uninterrupted
pass that needs substantial rework if an early assumption was wrong. A
bad assumption caught after phase 1 costs one phase; caught at the end,
it costs the whole build plus the redo.

## Skip audits and secondary skills you didn't ask for

`/full-audit` deliberately loads most of the skill set — right for an
actual full audit, wrong as a reflexive habit after routine changes.
Same logic at a smaller scale: don't stack `accessibility-chaos-testing`
+ `i18n-l10n-footprints` + `cost-billing-footprints` on a screen someone
just asked you to restyle, unless the mode is Thorough or something
about the change actually touches those concerns. Apply the one or two
skills genuinely relevant to what changed.

## Stop and ask instead of retry-looping

If an approach fails twice in a row, stop and diagnose
(`debugging-protocol`) rather than trying variations repeatedly — each
blind retry costs the same as a first attempt with none of the new
information. If genuinely blocked, say so and ask — one clarifying
exchange costs less than three wrong guesses plus the cleanup.

## Right-size responses in chat

Report what changed and what was verified. Skip restating the plan back,
skip re-explaining an already-applied rule, skip narrating routine steps
that surfaced nothing noteworthy. Verbose narration is spend with no
engineering value.

## Report spend-relevant info, not just results

At natural checkpoints in a long session (end of a phase, end of a
sizeable task), it's worth a one-line note on scope actually covered —
"verified the checkout flow only; didn't touch the admin side" — so the
person can judge whether that matched the mode they wanted, and adjust
before the next task rather than after quota's already gone.

## Model tier awareness (if your plan offers multiple tiers)

If lighter/faster model options exist on your Antigravity plan, reserve
the most capable tier for work that needs real reasoning (architecture
decisions, security review, subtle debugging) and use a lighter tier for
mechanical work (boilerplate, simple CRUD, straightforward copy) where
available. Check your plan's actual options directly — this skill
doesn't assume a specific tier exists.

## Self-check before starting any task

- What budget mode is this session in, and does this task's ceremony
  match it?
- Am I about to re-read something already in context?
- Could these next few tool calls be one batched pass instead of several?
- Am I regenerating a whole file for a change that's really one edit?
- Is this audit/sweep actually requested, or am I defaulting to it?
- If this is optional extra thoroughness, did I flag the cost first?

## Commands

`/budget [light|standard|thorough]` — set the session's spend mode
explicitly; holds until changed.
`/lean [task]` — do one task with minimum ceremony regardless of the
session's current mode: the change, a quick verify, a one-line report.
`/scope-check [task]` — before starting, state which ceremony tier this
task needs and why, so the person can redirect before spend happens.
`/spend-report` — summarize what's actually been done and verified so
far this session, so the person can judge whether scope matched intent.
