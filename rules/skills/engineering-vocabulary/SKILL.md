---
name: engineering-vocabulary
description: Use whenever naming an architecture pattern, choosing between database isolation/consistency strategies, discussing reliability metrics (SLO/SLI/MTTR), selecting a caching or rate-limiting strategy, or communicating a technical decision or trade-off precisely. This is a shared vocabulary reference, not a directive skill — pull the exact term so a decision gets named correctly instead of described vaguely. Trigger whenever choosing between two or more valid technical approaches, writing an architecture note, or reviewing a PR/plan that uses imprecise language for something that has a real name.
---

# Engineering vocabulary

Precise language leads to precise implementation. When two approaches
are both valid, name the one being chosen — "we're using optimistic
locking here because contention is low" is a decision; "we added a
version check" is the same decision undocumented. Use this as a lookup,
not a checklist to work through top to bottom.

## Architecture & design patterns

SRP (one reason to change per module) · Dependency Inversion (depend on
abstractions) · Repository pattern (abstract data access) · Unit of Work
(batch multi-table operations into one transaction) · CQRS (separate
read/write models when their patterns genuinely diverge) · Event
Sourcing (store state changes as events — audit trails, financial
systems, undo) · Saga pattern + Compensating Transaction (manage a
multi-step distributed operation via rollback actions, not a single
cross-service transaction) · Outbox pattern (write the event to a DB
table in the same transaction as the state change, publish
asynchronously — the standard fix for "the write succeeded but the
event never fired") · Circuit Breaker (stop calling a failing dependency
instead of retrying into it) · Bulkhead (isolate a failure so it can't
cascade — separate connection pools/thread pools per dependency) ·
Strangler Fig (route traffic incrementally from a legacy system to its
replacement instead of a big-bang rewrite) · Hexagonal/Ports & Adapters
(domain logic isolated from framework/DB/HTTP concerns) · Materialized
View (pre-computed query result for a heavy read path).

**Domain-Driven Design terms (missing from the source list, added):**
Bounded Context (a domain model is only consistent within its own
explicit boundary — don't let one "User" model mean subtly different
things in billing vs. auth) · Aggregate Root (the single entity through
which all writes to a related cluster of objects must go, to keep
invariants consistent) · Anti-Corruption Layer (a translation layer at
the boundary between two bounded contexts or between legacy and new
systems, so one model's assumptions don't leak into the other).

## Database & data

ACID (financial/inventory/booking transactions) vs. BASE (caches,
analytics, non-critical data). Optimistic locking (version check, retry
on conflict — low contention) vs. pessimistic locking (lock the row
before reading — high contention, e.g. the last seat). Isolation levels:
Read Committed (default, general queries) → Serializable (critical
financial operations). Phantom read / lost update — the specific races
that isolation level and locking choice actually prevent. Deadlock —
design lock ordering, detect and retry. Composite index / partial index
/ covering index — the specific indexing strategy for a specific query
shape, not "add an index" generically. Partitioning (split one large
table) vs. sharding (split across multiple databases) — different scale
problems, don't reach for sharding when partitioning solves it. WAL
(write-ahead log — crash recovery, replication). Soft delete (default
for user-facing data) vs. hard delete (GDPR erasure requests only).
Upsert (idempotent sync writes). CDC — Change Data Capture (stream DB
changes to other systems, e.g. keeping a search index or cache in sync
with the source of truth). Eventual consistency (caches, distributed
reads) vs. strong consistency (financial transactions, inventory). CAP
theorem — naming which two of consistency/availability/partition
tolerance a given design is actually choosing, explicitly, not by
accident. Replication lag — the specific reason a read-after-write can
return stale data on a read replica.

**Missing from the source list, added:** Two-Phase Commit / 2PC (the
classic distributed-transaction protocol — usually the wrong tool; a
Saga is almost always the better fit for anything spanning services).
Row-Level Security / RLS (database-enforced tenant/user isolation —
already used throughout the security and admin skills; naming it here
so it's recognized as the specific technique, not "we filter by user
ID"). Multi-tenancy strategy — shared schema with a `tenant_id` column
(cheapest, needs RLS) vs. schema-per-tenant vs. database-per-tenant
(most isolated, most operational overhead) — name which one a
multi-tenant feature is actually using, don't leave it implicit.

## Security

OWASP Top 10 — the standard reference list; a `/security-review` should
map findings to it explicitly, not just describe them ad hoc. IDOR,
XSS, SQLi, CSRF, SSRF — name the specific vulnerability class, not
"security issue." RBAC (role-based, most apps) vs. ABAC
(attribute-based, fine-grained). JWT + refresh token rotation. OAuth 2.0
vs. OIDC (OIDC is authentication on top of OAuth's authorization). HMAC
(webhook signature verification — already a rule elsewhere; this is the
mechanism's name). Zero Trust (verify every request regardless of
network origin — the model behind "never trust the client," stated as
an explicit posture). Principle of Least Privilege. Defense in Depth.
Threat Modeling — do this explicitly at the design phase of a
security-sensitive feature, not just at review time. SAST (static
analysis in CI) / DAST (dynamic analysis against staging) / SCA
(dependency vulnerability scanning) — three distinct pipeline stages,
not one "security scan." mTLS (mutual TLS — service-to-service auth
where both sides present certificates). WAF (edge-level traffic
filtering, complements but doesn't replace application-level
validation).

## APIs & networking

REST vs. GraphQL vs. gRPC — pick based on the actual data-shape and
performance need, not familiarity. WebSocket (persistent bidirectional)
vs. SSE (one-way server push) vs. long polling (missing from the source
list — the fallback when neither is available, higher latency, simpler
infra). Idempotency key (client-generated UUID on mutating calls).
ETag (conditional GET, cache validation). API Gateway vs. reverse
proxy — a gateway adds auth/rate-limiting/routing logic, a reverse proxy
is simpler traffic forwarding. Circuit breaker + retry with exponential
backoff + jitter (the jitter specifically prevents a thundering herd of
synchronized retries). Timeout on every external call, no exceptions.

**Rate-limiting algorithms (missing from the source list, added):**
Fixed Window (simple, allows bursts at window edges) · Sliding Window
(smoother, more accurate, more state) · Token Bucket (allows controlled
bursts up to bucket size, then throttles to refill rate) · Leaky Bucket
(smooths bursts into a constant output rate). Name which one a rate
limiter actually implements — "rate limited" alone doesn't specify the
behavior under burst traffic.

## Testing

Unit / integration / E2E / contract test — contract tests specifically
verify an API consumer and provider stay compatible, distinct from
integration tests. Load test (expected traffic) vs. stress test (find
the breaking point) vs. spike test (sudden traffic, e.g. a flash sale)
vs. soak test (extended duration — finds memory leaks) vs. smoke test
(quick post-deploy sanity check) vs. canary test (small % of real
traffic on a new version). Chaos Engineering — deliberately injecting
failure in a controlled way to verify resilience, the production-grade
version of the chaos-scenario habit already used elsewhere in this
config. Mock (simulated dependency) vs. stub (fixed-response fake) vs.
spy (records calls for verification) — pick the right one rather than
calling everything "a mock."

## DevOps & reliability metrics

SLA (external commitment) → SLO (internal target) → SLI (the actual
measured metric) — three different things often conflated as one. MTTR
(mean time to recovery) / MTBF (mean time between failures) — incident
response metrics. RTO (max acceptable downtime) / RPO (max acceptable
data loss) — disaster recovery planning, and they drive different
technical decisions (RTO drives failover speed, RPO drives backup
frequency). Error budget — the acceptable failure rate before halting
feature releases in favor of stability work; makes the velocity/
reliability trade-off explicit instead of implicit. RED method (Rate,
Errors, Duration) and Golden Signals (Latency, Traffic, Errors,
Saturation) — standard shapes for what to actually put on a service
dashboard, more useful than an ad hoc metric list. Feature flag vs. dark
launch (missing from the source list — dark launch runs new code in
production without exposing it to users, for a real-load smoke test)
vs. canary deployment vs. blue/green — four distinct risk-mitigation
techniques, not interchangeable.

## Performance & scaling

Latency (p50/p95/p99, not just an average) vs. throughput. Memoization
vs. caching — memoization is function-level, caching is usually a
broader data/response layer. Cache-aside vs. write-through vs.
write-behind vs. read-through — four different cache-consistency
trade-offs; name which one a caching layer implements. Cursor
pagination (large/real-time datasets) vs. offset pagination (small,
stable datasets). N+1 query problem — name it explicitly when
flagging it, since "slow query" undersells what's actually wrong and
how to fix it (eager loading / a join, not just "add caching").

## Frontend & mobile

Optimistic UI (update before server confirms — fast-feeling, needs a
rollback path) vs. pessimistic UI (wait for confirmation — critical
operations). Skeleton screen (perceived-performance loading state,
already a rule elsewhere — this is its name). Virtual scrolling (render
only visible items — required for any list past a few thousand rows).
Debouncing (search inputs, resize handlers). Code splitting + tree
shaking (bundle size discipline). PWA / Service Worker (offline
capability — ties directly to the `offline-sync-conflict-resolution`
skill). DataLoader pattern (missing from the source list — the standard
fix for GraphQL's version of the N+1 problem: batch and cache resolver
calls within a single request).

## Messaging & queues

Pub/Sub, Dead Letter Queue (failed messages land here for inspection,
not silently dropped), at-least-once vs. at-most-once vs. exactly-once
delivery (exactly-once is genuinely hard — most systems actually build
at-least-once + idempotent consumers, which achieves the same practical
result more reliably). Message deduplication — idempotency enforced at
the queue level, complementing the API-level idempotency key.

## Privacy & compliance

PII / PHI — name which category of data a field actually is; this
determines encryption/retention/access requirements. Pseudonymization
(reversible, tokens) vs. anonymization (irreversible) — materially
different privacy guarantees, don't use the terms interchangeably.
Data minimization + purpose limitation — collect and use only what's
actually needed for the stated purpose, a principle already implied by
`legal-compliance-copy` — named explicitly here.

## SDLC & process

Technical debt — track it explicitly rather than letting it stay
implicit; the Boy Scout Rule (leave code slightly cleaner than found)
is the low-friction way to pay it down continuously instead of in a
dedicated future sprint that never gets scheduled. ADR — Architecture
Decision Record: write one for any significant, hard-to-reverse
technical choice (database, auth provider, major dependency) so the
reasoning survives past the person who made the call. RFC — for a
proposed major architectural change that needs discussion before
committing. Spike — a time-boxed research task to resolve a genuine
unknown before committing to an approach, distinct from just starting
to build and hoping it works out.

## Common abbreviations quick-reference

CRUD · DTO · DAO · ORM/ODM · DI/IoC · TDD/BDD · DDD · BFF · FaaS/PaaS/
IaaS/SaaS · TTL · SSO · CVE/CVSS/CWE · SBOM · RCE · LFI/RFI · XXE ·
mTLS · GDPR/CCPA/POPIA/LGPD/PIPEDA — see the region-specific note in
`legal-compliance-copy` before assuming any one of these applies by
default to `[REGION / LOCALE]`.
