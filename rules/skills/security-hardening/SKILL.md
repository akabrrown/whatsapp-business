---
name: security-hardening
description: Use whenever writing or reviewing authentication, authorization, API endpoints, forms/user input, payment flows, file uploads, secrets/env config, webhooks, or anything touching PII. Enforces defense-in-depth — server-side authorization, IDOR checks, parameterized queries, secret handling, rate limiting, secure transport. Trigger on any endpoint, auth flow, payment integration, or database write path.
---

# Security hardening

Prime directive: assume every input is hostile, every client is
compromised, every secret will eventually leak. Worst-case question before
shipping any endpoint: "If someone had the client source, a browser
console, and unlimited time — what's the worst they could do?"

## Authentication

Never roll custom crypto/session logic. Passwords hashed with
bcrypt/argon2/scrypt only, never logged even in debug output. Short-lived
access tokens (15 min–1 hr) with refresh rotation, stored HttpOnly/Secure
/SameSite — never localStorage. Always re-verify sessions server-side,
never trust a cached or decoded-but-unverified JWT. MFA for
financial/admin accounts. Enumeration-proof errors ("incorrect email or
password," not "no account found"). Lockout/backoff per account AND IP.

## Authorization

Server-side on every request, never inferred from what the UI hides.
Enforce at BOTH middleware/gateway level AND query/row level. Every
multi-tenant query filters by tenant/user ID at the database layer.
Object-level checks on every ID-based lookup — this stops IDOR (changing
`?id=123` to `?id=124` must not expose someone else's data). Default
deny: new endpoints/roles start at zero access. Re-confirm identity for
high-impact admin actions.

## Input validation & injection

Server-side validation is the only real boundary; client-side is UX only.
Strict schema validation rejecting unknown fields. Parameterized
queries/ORM builders only, never string-concatenated SQL. Sanitize/encode
all user content, allow-list sanitizer for rich text. File uploads:
validate actual content/magic bytes, re-encode images server-side, store
outside the web root with no execute permission. Never deserialize
untrusted data unsafely. Never build shell commands by concatenation.

## Secrets & config

No secret ever in client-visible code, a public repo, or a shipped build
artifact. Env vars server-side only, `.env.example` documents names +
descriptions with placeholders, never real values. Rotate anything ever
committed, even briefly. Least privilege per credential, separate keys per
environment. Webhook signatures verified on every incoming payload.

## Transport & rate limiting

HTTPS + HSTS everywhere. CORS as an explicit allow-list, never `*` on
authenticated endpoints. Secure cookie flags always. CSRF protection on
cookie-authenticated mutations. Every public mutation endpoint rate-
limited per-IP AND per-account, stricter unauthenticated than
authenticated. Idempotency keys on payment-triggering endpoints.

## Data protection & error handling

Encrypt sensitive PII at rest if queryable in plaintext, hash irreversibly
if not. Minimize what's collected in the first place. Generic client-
facing errors, detailed errors to server logs only — no stack traces,
SQL errors, or internal paths reach the client. Logs never contain full
card numbers, passwords, tokens, or full session identifiers.

## Mobile-specific

Never store tokens/PII in plain SharedPreferences/UserDefaults — use
Keychain/Keystore-backed secure storage. Certificate pinning for
payment/sensitive API calls. Strip debug symbols from release builds.
Deep link parameters treated as untrusted input.

## Testing gate before shipping any endpoint

At least one test each for: unauthenticated access attempt, wrong-tenant/
wrong-user access attempt (IDOR), malformed/oversized input. Manually
attempt the worst-case question above on every new feature.

## Defense in depth — five layers, checked independently

A single strong layer is not defense in depth; each layer below should
hold even if another fails.

1. **Perimeter** — WAF, DDoS protection, CDN edge security, bot detection.
2. **Network** — VPC/network isolation, security groups/ACLs, private
   subnets for databases, VPN or equivalent for admin access.
3. **Application** — input validation, output encoding, authentication/
   authorization, rate limiting, CSRF protection (this is where most of
   §1–§6 above live).
4. **Data** — encryption at rest, encryption in transit (TLS 1.3),
   database-level encryption, encrypted backups.
5. **Monitoring** — intrusion detection, log aggregation, anomaly
   detection, and an actual incident response plan (below) — not just
   logging for its own sake.

## Incident response plan — have this before you need it

1. **Detection** — automated alerts, user reports, third-party
   notifications.
2. **Containment** — isolate affected systems, disable compromised
   accounts, block malicious IPs.
3. **Eradication** — remove the actual malware/backdoor/vulnerability,
   patch it, rotate any exposed credentials.
4. **Recovery** — restore from clean backups, verify integrity, gradual
   return to service.
5. **Post-incident** — root cause analysis, timeline documentation,
   process improvements, and communication to affected users/regulators
   where required.

Writing this after an incident starts is too late — it belongs in the
project's documentation before `production-readiness-gate` calls
anything production-ready.

## Commands

`/security-review [feature]` — audit only, gap + file/line + severity + attack enabled.
`/harden [feature]` — apply fixes for every gap, re-run until clean.
`/idor-check [endpoint]` — specifically test whether changing an ID exposes another user's/tenant's data.
`/secrets-sweep` — scan codebase and git history for anything that should never have been committed.
