---
name: debugging-protocol
description: Use whenever an operation succeeds but the result is wrong, empty, or stale — upload works but list doesn't show it, request returns 200 but nothing changed, no crash but wrong output. Also use for any explicit bug report or "this doesn't work as expected." Traces the full data path end to end instead of guessing at a patch. Trigger on any bug report, failed test, or unexpected behavior.
---

# Debugging protocol

Prime directive: find the root cause, not a patch. Never hide a symptom
(a null check that silently swallows an error, a spinner that never
resolves, an empty catch block). If a real root cause can't be found, say
so — don't guess with a speculative fix.

## 1. Reproduce before touching code

State expected behavior in one sentence, observed behavior in one
sentence, and the smallest reproduction sequence. Never propose a fix for
a bug not pinned to a specific step.

## 2. Trace the full data path, end to end

"Write succeeds but next page shows nothing" is almost always a break in
this chain — walk it in order:

1. Client action — was the right payload actually sent?
2. Server receipt — did it actually persist? (check the DB directly)
3. Response shape — does it match what the client expects? (a renamed
   field or extra wrapper is the #1 cause of "empty but no error")
4. State update — does client state actually update after the response?
5. Cache/revalidation — fresh data or a stale cache?
6. Navigation timing — does navigation fire before the write completes?
   (race condition)
7. Query/filter on read — right tenant/user/session ID filter?
8. Render condition — does a truthy/falsy check treat valid data as empty?

## 3. Instrument before you guess

Log actual values at each link, not just "reached this point." For
writes, log the response AND separately query storage directly to
confirm what was actually persisted. Remove all temporary debug logging
once root cause is confirmed.

## 4. Common root causes

Field name mismatch · stale closure reading the wrong response · write/
read table mismatch · tenant/user filter mismatch · navigation before
write commits · uninvalidated stale cache reads · optimistic UI
overwritten by a late refetch · component reading unupdated global state
· wrong loading/error/empty branch · silently swallowed server exception
returning 200 · missing `await` · RLS policy silently filtering rows ·
content-type/parse mismatch · ID type mismatch (string vs. number, UUID
vs. int).

## 5. Fix standards

Fix the actual break, not the nearest symptom. Race condition → fix
sequencing (await, invalidate, then navigate), never a `setTimeout`
band-aid. Silent failure → fail loudly in logs, gracefully in UI. Re-run
the exact reproduction steps to confirm.

## 6. Report format

`ROOT CAUSE:` mechanism + file/line/field. `FIX:` what changed.
`VERIFIED:` what was actually re-run/inspected. `WATCH FOR:` only if a
real related risk exists.

## 7. When root cause isn't found

Say so directly, name exactly what's missing (a log, a screenshot, a
file), never claim confidence in an unverified fix.

## Commands

`/debug [description]` — run the full protocol.
`/trace [flow]` — walk the data path for the named flow, diagnosis only, no fix.
`/no-guess` — refuse to propose a fix until root cause is confirmed with evidence.
