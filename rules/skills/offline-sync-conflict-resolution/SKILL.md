---
name: offline-sync-conflict-resolution
description: Use whenever building or reviewing an offline-capable feature — Service Worker + IndexedDB caching, a local-first mobile app with a sync engine, or any UI with queued/syncing/conflict states. Covers conflict resolution strategy (last-write-wins vs. merge vs. manual), sync queue design, and the UI states offline-first products need but rarely get right. Trigger on "offline," "sync," "IndexedDB," "Service Worker," "queued," or any multi-device/multi-user write against the same record.
---

# Offline sync & conflict resolution

Prime rule: offline support isn't "cache the last response and show it
when there's no network." It's "the user can keep working with no
connection, and when connectivity returns, their changes reconcile with
whatever happened on the server in the meantime — without silently
losing either side's work."

## Pick a conflict resolution strategy deliberately, per data type

Don't apply one strategy uniformly across an entire app — the right
choice depends on what the data actually represents:

- **Last-write-wins (LWW)** — simplest, appropriate for data where only
  one person plausibly edits a given record (a user's own profile
  settings, a personal draft). Requires a reliable timestamp or version
  number, not wall-clock time alone across devices with clock drift —
  use a server-issued or logical (Lamport/vector) clock, not the
  client's local `Date.now()`, to decide "last."
- **Field-level merge** — for records with independent fields multiple
  actors might edit (a shift log entry where one field is edited by the
  porter and another by the admin), merge non-conflicting field changes
  automatically and only surface a conflict when the *same* field
  changed on both sides.
- **CRDT (conflict-free replicated data type)** — for counters, sets, or
  collaborative text where automatic, mathematically conflict-free
  merging is worth the complexity (a shared availability counter, a
  collaborative note). Don't reach for this by default — it's real
  complexity, justified only when the data shape actually benefits.
- **Manual/user-resolved merge** — for anything where an automatic
  choice could lose meaningful intent (two edits to the same booking's
  date, conflicting status changes on the same ticket). Show both
  versions side by side and let the user pick or combine — never
  silently discard one side.
- **Server-authoritative with client rejection** — for anything gated by
  a scarce resource (the last hostel bed, the last event seat): the
  client's optimistic local write is provisional only; the server is the
  final arbiter, and a rejected write must surface clearly to the user,
  not vanish silently. This overlaps directly with defensive-coding's
  race-condition rules — the offline case is the same problem with a
  longer window.

## Sync queue design

- Every queued mutation carries enough metadata to resolve later:
  client-generated ID (so the same write isn't duplicated if retried),
  timestamp/version, and the specific fields changed — not just "this
  record was touched."
- Queue writes in order, but don't assume they'll apply in order on the
  server if multiple devices are queuing concurrently — the resolution
  strategy above has to hold regardless of arrival order.
- A write that fails permanently (rejected by the server, not just
  network-retryable) needs to surface to the user as a real failure
  state, not sit invisibly in a queue forever or get silently dropped.
- Idempotency keys on queued writes (see defensive-coding) — a write
  that gets queued, sent, times out, and retried by the sync engine
  itself must not become a duplicate record on the server.

## Required UI states — treat these as first-class, not an afterthought toast

`queued` (written locally, not yet sent) · `syncing` (in flight) ·
`synced` (confirmed by the server) · `conflict` (both sides changed,
needs resolution) · `failed` (rejected, needs user action). A record
sitting in `queued` for an extended period should be visible to the
user as "not yet saved to the server," not indistinguishable from a
fully synced one — silently treating queued-but-unsynced data as final
is how users lose data they thought was safe.

## IndexedDB / local-store specifics

- Schema-version the local store the same way you'd version a server
  migration — a Service Worker update that changes the expected local
  shape needs a real migration path, not an assumption the store is
  always current.
- Don't treat IndexedDB as infinite — set a real eviction/retention
  policy for cached data the user hasn't touched recently, especially
  on mobile where storage is constrained.
- Encrypt sensitive fields in local storage if the product handles PII
  offline (ties to the security-hardening skill's mobile-specific
  section) — a stolen or shared device shouldn't expose synced data at
  rest.

## Common mistakes this skill exists to prevent

Treating "offline" as a single boolean instead of the five real states
above · resolving every conflict as last-write-wins regardless of what
the data represents · trusting client timestamps across devices with
clock drift · a sync queue with no idempotency, producing duplicate
records on retry · queued writes that silently vanish on permanent
rejection · no local schema versioning, so an app update corrupts
previously-cached data.

## Commands

`/sync-design [feature]` — propose a conflict resolution strategy per
field/data type for the named feature, with the five sync states wired
into the UI plan.
`/sync-audit [feature]` — review existing offline/sync code against this
skill, flag missing states, missing idempotency, or an inappropriate
resolution strategy for the data shape.
