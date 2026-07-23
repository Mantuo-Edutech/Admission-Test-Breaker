# ADR: Source-bound manual review decision ledger

**Status:** Accepted
**Date:** 2026-07-19

## Context

The product catalog and feature manifests already separated automated claims from
human review groups. That was sufficient to report missing work, but not to execute it
safely. A reviewer could only edit a YAML status, evidence could be changed after sign-off,
and a later content revision could accidentally retain an approval for an older source.
A generated dashboard would not solve those integrity problems.

## Decision

Human review remains an explicit non-automated act, recorded in a repository-backed
decision ledger:

- each pending review is fingerprinted from its exact requirement, campaign, owner role,
  product versions and routes, catalog evidence, and feature-claim artifacts;
- review packets are generated with `pnpm review:prepare` and contain the current source
  fingerprint and complete product scope;
- a recorded decision uses privacy-safe role references, declares reviewer independence,
  includes an owner-role approval and explicit attestation, and pins at least one local
  evidence report by SHA-256;
- only the latest current-source `approved` decision can satisfy a pending manual check;
  `changes-requested` and stale decisions remain visible history but do not release;
- an evidence hash mismatch is treated as tampering and fails the release gate;
- decisions and evidence remain under `verification/reviews/`, outside the public browser
  bundle and outside learner data.

Feature manifests continue to declare the required manual checks. The generated release
report consumes validated decisions as an evidence overlay; the generated worklist shows
only the still-unresolved checks. Existing inline passed checks retain their older complete
reviewer/role/date/evidence contract.

## Consequences

The current 56 reviews are executable and auditable, but none is automatically approved. The
current closed-Beta count correctly remains 0/36 until qualified reviewers perform the
work. Content revisions fail closed by invalidating earlier approvals without deleting
their history. This ledger is not a cryptographic identity or qualified electronic
signature; production reviewer accounts and stronger signing can be added later without
weakening the repository release contract.
