---
name: production-engineering
description: Use whenever designing a database schema/migration, writing a query, adding caching, building an API that will see real traffic, working on anything with multiple service hops, or making a scaling/reliability decision. Enforces database engineering rigor, performance budgets, scalability limits, reliability patterns (retries/circuit breakers/idempotency), observability, and testing depth. Trigger on schema changes, new API endpoints, caching logic, or any "will this hold up at scale" question.
---

# Production engineering

## Performance

Inspect: Big-O complexity, memory/CPU usage, blocking operations,
database indexing, N+1 elimination via joins/batching, pagination, lazy
loading, streaming, compression, connection pooling, caching with real
invalidation, edge/CDN caching. Budgets: LCP < 2.5s, INP < 200ms,
CLS < 0.1, initial JS < 200KB gzipped per route. Mobile: cold start
under ~2s, list virtualization, image caching. Warn before a performance
issue becomes a production incident — don't wait to be asked.

## Database engineering

Review on every schema change: normalization vs. intentional
denormalization, constraints, foreign keys, transactions and isolation
levels, migrations (timestamped, reversible, descriptively named — never
`Migration1`), read replicas, replication, partitioning/sharding where
scale demands it, indexing strategy, locking behavior, CAP trade-offs for
the consistency the product actually needs. Migrations never silently
destructive without an explicit rollback path.

## Scalability

Evaluate: horizontal vs. vertical fit, stateless service design, load
balancing, reverse proxies, API gateways, service discovery, multi-region
needs, distributed caching, autoscaling triggers. If the architecture
won't scale past a known threshold, name the threshold explicitly — don't
let it get discovered in production.

## Reliability & concurrency

Retries with exponential backoff, timeouts on every external call,
circuit breakers around flaky dependencies, idempotency on retried
mutations, graceful shutdown, health/readiness/liveness probes, failover
paths, dead-letter queues, backpressure under load. Concurrency: race
conditions, deadlocks, thread safety, distributed locks, optimistic vs.
pessimistic locking, atomic operations — checked wherever two writers can
touch the same row/resource.

## API design

REST/GraphQL/gRPC conventions followed deliberately. Validation on every
input. Pagination/filtering/sorting on any list that can grow. Explicit
versioning. Real status codes — no 200 masking a failure. Consistent
error response shape. Idempotency on safely-retryable endpoints.

## Observability

Structured logging (not scattered console.log), metrics, distributed
tracing for anything with more than one service hop, monitoring
dashboards, alerting tied to real thresholds, SLOs/SLIs for critical
paths. If it can fail silently in production without anyone finding out
for days, that's a gap — close it before shipping.

## Testing strategy

Unit tests for logic, integration tests for the seams (API ↔ DB ↔
external services), at least one e2e test per critical path, load tests
before traffic-sensitive launches, regression tests for every bug that
was ever actually shipped. Test failure paths, not just the happy path —
a form with only "submit succeeds" tested is not tested.

## Code quality

Enforce SOLID, DRY, KISS, YAGNI, clean architecture, separation of
concerns, dependency injection where it earns its complexity, strict
type safety, real error handling (never a swallowed exception), naming
that reveals domain intent.

## Devops

CI/CD with build gates, not manual pushes. IaC (Terraform/Helm or
equivalent) beyond a single-service hobby deploy. Secrets via a real
secrets store, never committed files. Rollback path defined before the
first deploy. Deployment strategy (canary/blue-green/rolling) chosen
deliberately for the product's real risk tolerance.

## Commands

`/production-score` — score the project against §Production Readiness Scorecard (see production-readiness-gate skill), remediation for anything under 7.
