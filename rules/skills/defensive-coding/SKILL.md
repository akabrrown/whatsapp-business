---
name: defensive-coding
description: Use whenever building any feature that mutates data — payments, bookings, form submissions, checkout, orders, reservations, likes/votes, file uploads, or any button a user could click twice. Prevents double-charges, duplicate bookings, race conditions on shared resources, and silent failures from a dropped connection mid-operation. Trigger on "pay," "book," "submit," "checkout," "reserve," "order," or any endpoint that changes state and costs money or claims a limited resource.
---

# Defensive coding — chaos-resilience layer

You write code that is paranoid, defensive, and assumes users are
malicious, networks are flaky, and databases will race. Before writing
ANY code for a mutating feature, silently work through every category
below. Do not just "make it work" — make it survive misuse.

## 1. Idempotency & duplicate prevention

Every mutating operation (payments, bookings, orders, form submissions)
MUST be idempotent. Client generates a UUID per user *intent* (not per
click) and sends it as an `Idempotency-Key` header. Server stores
`idempotency_key + user_id + response`; a repeat key within 24h returns
the cached response, a repeat key with a *different* payload returns 409
Conflict. Buttons disable immediately on first click with a loading
state — this alone stops most rapid-click/Enter-spam double-submits.
Webhooks: verify uniqueness via signature + event ID before processing,
never on payload shape alone.

## 2. Race conditions & concurrency

Assume two requests hit the server for the same resource at the same
instant. Never read-then-write in separate steps for anything that costs
money or claims a limited slot (last seat, last unit of stock) — use
atomic upserts, compare-and-swap, or optimistic locking with a `version`
column. Enforce scarcity constraints at the DATABASE level (unique
indexes, check constraints) — never trust an application-level check
alone, since two requests can both pass the check before either writes.
Explicitly handle "lost update" and "phantom read" scenarios for
anything with concurrent writers.

## 3. Network & failure resilience

Every API call has a timeout — never infinite. Distinguish retryable
errors (5xx, timeout) from non-retryable ones (4xx, validation failure);
retry only the former, with exponential backoff + jitter. Circuit
breakers around flaky downstream services. If a request fails, the UI
shows a clear state — never leave the user unsure whether their payment
went through. Use "at-least-once" delivery with idempotency, or an
outbox pattern, for critical events (order placed, payment captured).

## 4. State management edge cases

Cancel/ignore async operations on component unmount to prevent memory
leaks and state updates on unmounted components. Guard against stale
closures in callbacks and effects. Optimistic UI implements rollback on
failure and reconciliation on success. If a user clicks "Pay" then
immediately navigates away or hits back, the operation must still
complete correctly server-side or cancel cleanly — never depend on the
client staying mounted to finish a mutation.

## 5. Input validation & sanitization

Validate on BOTH client (UX) and server (security) — never trust the
client alone. Strict type, length, format, and range checks. Sanitize
before rendering to prevent XSS; parameterized queries to prevent
injection. File uploads validated by actual content/magic bytes, not
just extension — scan for malware if the product's risk profile
warrants it.

## 6. Session, auth & permission edge cases

Handle token expiration mid-operation with silent refresh and request
queuing during the refresh window. Verify permissions on every server
endpoint — a hidden button is not access control. Handle concurrent
logins from multiple devices and invalidate stale sessions
appropriately. CSRF protection on every state-changing operation that
relies on cookie auth.

## 7. Payment & financial safety

Idempotency key per checkout session, always. Never trust frontend state
to determine payment status — verify against the payment provider's API
before confirming success to the user. Webhook signature verification is
non-negotiable; process webhooks asynchronously with retry logic. Handle
the partial-failure case explicitly: if payment succeeds but order
creation fails, trigger automatic reconciliation or refund — don't leave
a charged-but-orderless customer.

## 8. Testing for chaos

After writing the code, name at least ten specific chaos scenarios this
feature must survive — e.g. "user taps pay 50 times in one second,"
"connection drops after payment capture but before order save," "two
users try to book the last seat within the same 100ms window," "token
expires mid-multi-step-checkout." Write a test (or at minimum a test
plan) for each one. Every conditional branch gets a test, including the
error branches — not just the happy path.

## 9. UX safety

Loading states disable interactive elements to prevent double-submission.
Errors are clear and non-technical, not a stack trace. Confirmation
dialogs for destructive/irreversible actions. Preserve user input on
error so they never have to retype a form. Provide a "check status" or
recovery path if the user closes the app mid-operation (e.g. "did my
booking go through?").

## 10. Observability

Log every critical operation with a correlation ID: request ID, user ID,
timestamp, outcome. Never log PII, passwords, tokens, or full card
numbers. Emit metrics for success rate, latency, error rate. Alert on
anomalies — 10x normal payment volume, repeated duplicate-key errors, a
spike in a specific error code.

## Output rule

Code that only "works in the happy path" is wrong. If a mutation
involves money, inventory, or a unique reservation, it uses transactions,
locks, or DB-level constraints — not just application logic. Comment
only where a specific defensive measure from the categories above needs
explaining; don't narrate the obvious.

## Common vibe-coding mistakes this skill exists to prevent

Missing idempotency on payment/booking endpoints (leads to duplicate
charges from double-clicks or retried requests) · trusting client-side
inventory checks instead of DB constraints (two users book the last
seat) · read-then-write races on counters/balances · no timeout on
external calls · optimistic UI with no rollback path · silent webhook
processing with no signature check · treating "the request returned 200"
as proof the operation actually completed downstream.
