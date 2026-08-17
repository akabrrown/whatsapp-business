---
name: admin-multi-role
description: Use whenever building an admin panel, CMS, or any system with more than one user role (e.g. Student/Porter/Admin/Director) needing different views into shared data. Covers permission matrices, role enforcement at UI/API/data layers, audit trails, and destructive-action safeguards. Trigger on multi-role features, admin dashboards, or anything involving [USER ROLES] with differing access levels.
---

# Admin & multi-role dashboard

Prime directive: an admin panel is a distinct, higher-blast-radius
surface, not "the app with more buttons." Design for clarity and
reversibility over cleverness.

## 1. Define roles before building anything

Write out explicitly, before any code: every role, what each can read (by
data type), what each can write (by specific action, not "can edit
things"), what each can do to OTHER users' data, and which actions are
irreversible. This is the permission matrix — every screen and endpoint
gets checked against it, not designed ad hoc.

## 2. Enforce at three layers

UI (hide/disable — UX only, never security) · API/middleware (reject
server-side regardless of what the UI allowed) · data layer (row-level
security so a role literally cannot retrieve out-of-scope rows). Never
infer role from anything client-supplied. Role checks live in one central
policy layer, never scattered inline `if (user.role === 'admin')` copies.
Hierarchical roles inherit, never duplicate a peer's permission set.

## 3. Admin-to-frontend data flow

Admin actions update the shared source of truth directly, never a
separate admin-only copy. Cache invalidation on every admin action that
changes what another role sees. Real-time updates where the product's
usage pattern needs immediacy. Status/workflow fields are explicit enums
with a defined transition graph, invalid transitions rejected at the API
layer.

## 4. Audit trail

Every data-changing admin action logged (who, what changed before/after,
when). Append-only, never editable through the admin UI itself. Surfaced
somewhere admins actually see it. Non-negotiable for financial or
access-control actions.

## 5. Destructive actions

Explicit confirmation naming the specific affected item/count ("Delete 14
records?" not "Are you sure?"). Prefer soft delete for anything tied to
payments, accounts, or audit-relevant records. Bulk actions preview what's
affected before committing.

## 6. Admin UX

Real pagination/virtualization for growing lists. Filtering matching how
an admin actually thinks about the data. Admin forms validated as
rigorously as public ones — admin users mistype too, and here the blast
radius is bigger. Fully handled loading/error states — admin panels are
not exempt.

## 7. Security tie-in

Apply the security-hardening skill in full, with particular emphasis on
IDOR checks and data-layer authorization — admin endpoints are the prime
target precisely because they touch more data. Every new admin endpoint
gets `/idor-check` and `/security-review` before being considered done.

## Build order

Permission matrix → database (role schema, RLS, audit log table) →
central policy layer → API (auth + authorization + audit logging from the
start) → admin UI (role-specific compositions, real pagination,
destructive-action confirmations) → cross-role propagation check → tests
confirming each role CANNOT access another role's data, not just that it
CAN access its own.

## Commands

`/permission-matrix [system]` — produce the role/access table for review before code.
`/scaffold-admin [feature]` — build the full admin-side feature per the build order above.
`/role-audit [role]` — report everything a role can currently see/do, derived from actual code.
`/cross-role-check [action]` — trace propagation of an admin action to every other role's view.
