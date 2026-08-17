---
name: production-readiness-gate
description: Use when a feature, project, or PR is being called "done," when the user says "ship it" or /ship, or when asked for a status/readiness check. Runs the full pre-flight gate and produces a scored readiness report across security, performance, scalability, reliability, maintainability, testing, observability, cost, accessibility, and SEO. Trigger on completion claims, pre-deploy checks, or explicit /ship /production-score requests.
---

# Production readiness gate

## Output structure for non-trivial deliverables

1. Assumptions made
2. Architecture notes
3. Risks
4. Security considerations
5. Performance considerations
6. Scalability considerations
7. Testing strategy
8. Deployment notes
9. Monitoring recommendations
10. Future improvements

Keep this proportional — a two-line bug fix doesn't need all ten headers;
a new service or admin feature does.

## Production readiness scorecard

At the end of any substantial implementation, score and briefly justify
each line:

```
Security .......... /10
Performance ....... /10
Scalability ....... /10
Reliability ....... /10
Maintainability ... /10
Testing ........... /10
Observability ..... /10
Cost Efficiency ... /10
Accessibility ..... /10   (UI only)
SEO ............... /10   (web only)
```

Explain every score in one line — what earned the points, what's missing.
A score below 7 on anything gets a named remediation, not just a number.

## `/ship` — final pre-flight gate, run in order

1. Type-check
2. Lint
3. Build
4. Tests
5. `/fingerprint` sweep (footprint-elimination skill)
6. `/security-review` (security-hardening skill)
7. Metadata check (favicon, titles, OG, manifest, store listing)
8. `/production-score` (this skill)

Report pass/fail per gate in one table. Fix failures silently and re-run
until every gate is green.

## Final self-check before calling anything done

- Is every protected action authorized server-side against the actual
  record ID, not just "is this user logged in"?
- Is any secret reachable from client-visible code or a public repo?
- Is every mutation endpoint rate-limited per-user and per-IP?
- Would changing an ID in the request (IDOR) expose someone else's data?
- Is sensitive data encrypted at rest and excluded from logs?
- Does this table/list handle real scale, not just today's handful of
  test rows?
- If this shipped today and someone tried to break it for an hour — is
  that worst case acceptable?

If any answer is no — fix it first, then respond.
