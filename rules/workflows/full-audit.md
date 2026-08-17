# full-audit.md — global workflow

Trigger: `/full-audit` (optionally `/full-audit [path]` to scope to a
subdirectory instead of the whole project).

## What this does

Runs a complete, audit-only sweep of the current project against every
relevant skill. Changes nothing on the first pass — this is diagnosis,
not remediation. Work through every category below in order, for every
file in scope, not just the first few that look clean. Present one
consolidated report at the end (§Report format), then wait for
confirmation before fixing anything.

This is a deliberately heavy operation — it loads most of the skill set
in sequence. That's the right cost for an actual full audit, but this
workflow should only run when explicitly invoked, never as a reflexive
"let me also check everything" after a routine change. For narrower
iteration, name the one relevant skill directly instead.

## Sweep order

1. **Footprint elimination** — explicitly load the `footprint-elimination`
   skill and run its `/fingerprint` sweep: code, mobile, backend, design,
   copy, assets/metadata, git history, docs. Report every finding with
   file:line and severity.

2. **Security** — explicitly load `security-hardening` and run
   `/security-review` across every endpoint, form, and auth flow found in
   the project. Include an `/idor-check` pass on every ID-based lookup.

3. **Defensive coding** — explicitly load `defensive-coding` and check
   every mutating endpoint (payments, bookings, orders, form submits) for
   missing idempotency, race-condition exposure, and untested chaos
   scenarios.

4. **Production engineering** — explicitly load `production-engineering`
   and review the database schema, caching, API design, and reliability
   patterns (retries, timeouts, circuit breakers) actually present in the
   code, not just assumed.

5. **Backend/admin/database** — explicitly load `backend-admin-database`
   and check for schema-to-API-to-frontend mismatches: fields the DB has
   that the API doesn't expose, fields the frontend expects that the API
   doesn't send, admin endpoints duplicating public logic instead of
   sharing it.

6. **UI/UX design** — explicitly load `ui-ux-design` and run
   `/design-fingerprint` against every distinct screen: cliché zones,
   template heroes, stock theme residue, one-signature-detail check.

7. **Accessibility** — explicitly load `accessibility-chaos-testing` and
   run `/a11y-audit` (static WCAG sweep) on every screen. If time/scope
   allows, run the full `/a11y-chaos` walkthrough on the 2-3 most
   critical user flows.

8. **i18n/l10n** (skip if the project is genuinely single-language with
   no planned expansion) — explicitly load `i18n-l10n-footprints` and run
   `/i18n-audit` for hardcoded strings, concatenated sentences, and
   locale-unaware formatting.

9. **Offline/sync** (skip if the project has no offline-capable feature)
   — explicitly load `offline-sync-conflict-resolution` and run
   `/sync-audit` on any Service Worker/IndexedDB/local-first code.

10. **Cost/billing** — explicitly load `cost-billing-footprints` and run
    `/cost-audit` against every integration with a metered dependency
    (payment processor, SMS/email provider, LLM API, cloud storage) and
    every autoscaling/cron/background-worker config.

11. **Legal/compliance copy** (skip if the project has no privacy
    policy/terms/consent flow) — explicitly load `legal-compliance-copy`
    and run `/compliance-mismatch-check`.

12. **Admin/multi-role** (skip if single-role) — explicitly load
    `admin-multi-role` and run `/role-audit` for every role, confirming
    each role cannot access another role's restricted data.

13. **Production readiness** — explicitly load `production-readiness-gate`
    and produce the full scorecard (Security/Performance/Scalability/
    Reliability/Maintainability/Testing/Observability/Cost/Accessibility/
    SEO, each /10 with justification).

14. **Process integrity** — explicitly load `software-engineering-os` and
    run `/self-review` against the whole project: were requirements
    actually understood at the time, or retrofitted after the fact? Is
    anything reported as "done" that was never actually verified? Flag
    any place a prior claim of completion wasn't backed by real
    evidence (Verified vs. Assumed).

## Report format

One consolidated report at the end, grouped by section 1–13:

```
[SEVERITY] file:line — what was found — recommended fix
```

Then a per-section summary line: "Section N: X findings, 0 fixed
(audit-only), X flagged for human review." Keep it scannable — findings
only, no restating this checklist back.

## Flag, don't auto-fix (confirm before touching)

- Rewriting git history.
- Any copy change with legal/compliance meaning.
- Any secret found in git history — flag for rotation, don't rotate.
- Large structural redesigns implied by the design sweep.
- Any change to a conflict-resolution strategy already live in
  production data.

## After the report

Ask which findings to act on. Only then load the relevant skill's
remediation command (`/de-ai`, `/harden`, `/design-build`, etc.) and
re-run that section's audit to confirm zero remaining findings before
moving to the next.
