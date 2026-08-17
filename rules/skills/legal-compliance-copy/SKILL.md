---
name: legal-compliance-copy
description: Use whenever writing or reviewing a privacy policy, terms of service, cookie banner, consent flow, data deletion/export feature, or any copy referencing GDPR, POPIA, CCPA, or a regional data protection law like Ghana's Data Protection Act. Flags generic template legal copy that doesn't match what the product actually does, and routes anything with real legal weight to a human for review rather than auto-generating it. Trigger on `[REGION / LOCALE]` compliance work, cookie/consent UI, or any "add a privacy policy" request.
---

# Legal & compliance copy

Prime rule: this skill catches mismatches and generic-template tells in
compliance-adjacent copy. It does not replace a lawyer, and it never
silently rewrites language with real legal meaning — that always gets
flagged for a human decision, per the master prompt's "what not to
auto-fix" rule. The goal is recognizing when copy is generic boilerplate
that doesn't reflect the actual product, not generating new binding
legal text.

## The core footprint: boilerplate that doesn't match reality

The single most common AI/template tell in this category is legal copy
describing services, data flows, or third parties the product doesn't
actually use — a privacy policy mentioning cookies the site doesn't set,
a GDPR clause referencing an EU representative that doesn't exist for a
Ghana-only product, a cookie banner listing analytics/advertising
categories when the site only sets a session cookie. This is worse than
just looking generic — it's a document that misrepresents what the
product does, which is a real compliance risk, not just a design smell.

**Check for:**
- Third-party services named in the policy that the codebase doesn't
  actually integrate (a leftover from a template — check against the
  real dependency list, not assumption).
- Data categories claimed to be collected/not collected that don't match
  what the forms and database schema actually capture.
- A cookie banner offering to reject categories of cookies the site
  never sets in the first place (makes the consent mechanism
  meaningless rather than protective).
- Retention periods stated in the policy that don't match the actual
  `deleted_at`/retention logic in the database layer (ties directly to
  the backend-admin-database skill's soft-delete conventions — if the
  policy says "deleted immediately" but the schema soft-deletes and
  retains for 90 days, that's a real mismatch, not a copy nitpick).
- A named data protection officer/contact address that's a placeholder
  rather than a real, monitored contact.

## Consent flow footprints

- Pre-ticked consent checkboxes (invalid under most modern consent
  frameworks — consent must be an affirmative act).
- A "reject all" option that's visually harder to find or use than
  "accept all" — asymmetric friction is a recognized dark pattern, not
  neutral design.
- Consent bundled — a single checkbox covering multiple distinct
  purposes (marketing email AND analytics AND third-party sharing) that
  should be separable.
- No accessible way to withdraw consent later that's as easy as giving
  it initially.

## Data subject rights — implementation, not just policy text

If the policy promises data export/deletion rights, verify the product
actually has a working path to fulfill them — a documented right with no
corresponding feature is itself a compliance gap, and building the
promise into copy before the feature exists is a mismatch this skill
should flag, not silently let through. This connects directly to the
backend-admin-database skill's audit-log and soft-delete patterns: a
real deletion request needs a real, auditable path through the data
layer, not just a policy sentence.

## Region-specific pointers (informational, not exhaustive)

Different regimes have materially different requirements — GDPR (EU),
POPIA (South Africa), CCPA/CPRA (California), and Ghana's Data
Protection Act (Act 843) each define "personal data," lawful basis, and
subject rights somewhat differently. When `[REGION / LOCALE]` is set,
copy should reflect that specific regime's terminology and requirements
rather than a generic "GDPR-style" template applied regardless of actual
target market — but the specific legal requirements for a given regime
are exactly the part that needs a qualified reviewer, not an assumption
carried over from a template.

## Compliance maturity roadmap (informational — sequencing, not legal advice)

Real compliance work is staged, not built all at once. Recognizing which
stage a project is actually at prevents both under-building (shipping
enterprise sales promises with no operational backing) and over-building
(certification work before there's a product worth certifying):

1. **Foundation** — data inventory (what's actually collected), an
   accurate (not templated) privacy policy, consent management, a
   security baseline.
2. **Operational** — real access controls (RBAC, ties to
   `security-hardening`), audit logging, data retention policies, an
   incident response plan (see `security-hardening`'s version of this).
3. **Certification** — SOC 2 Type I then Type II, ISO 27001, GDPR
   compliance if serving EU users — these require the operational stage
   to genuinely be in place first, not just claimed.
4. **Enterprise-grade** — HIPAA, PCI DSS, FedRAMP, or other
   sector-specific requirements, only once there's real enterprise
   demand to justify the cost.

Flag it clearly if a product's compliance copy or sales claims are
ahead of which stage its actual implementation has reached — this is
the same mismatch category as §"the core footprint" above, just at the
roadmap level instead of the document level.

## What this skill does NOT do

It does not draft or finalize binding privacy policy or terms-of-service
language, does not make a determination about legal compliance, and does
not substitute for review by a lawyer qualified in the relevant
jurisdiction. Its job is narrower: catch copy/product mismatches, flag
dark-pattern consent UI, and verify that rights promised in text have a
real implementation — then hand anything with actual legal weight to a
human for sign-off.

## Report format

`[FLAG] location — what the copy claims — what the product actually
does — needs human legal review before this ships`. Never silently
"fix" the language; only fix the underlying product/copy mismatch once
a human has confirmed which side (the copy or the feature) should
change.

## Commands

`/compliance-mismatch-check` — sweep policy/consent copy against the
actual codebase (dependencies, schema, retention logic) for the
mismatches above; report only, no auto-fix.
