# Source-bound production evidence ledger

Date: 2026-07-24
Status: accepted

## Context

The original 100-person Beta assessment mixed three different facts in one editable JSON file:
repository capability, a historical description of cloud state, and work that requires a qualified
human. This allowed the narrative to drift after Supabase projects or workflows changed. It also
made it possible to mark a P0 gate as verified without proving which deployed release, project or
test implementation produced the result.

The product needs an independent layer that an Agent can rerun, while preserving the boundary that
legal review, real email delivery, MFA ownership, real-device UAT and a recovery drill are not
software unit tests.

## Decision

`verification/production/control-catalog.json` is the stable production control plane. Every
non-repository P0 gate maps to explicit automated and/or manual controls. Each control declares its
target, freshness limit, source files, scope and, for automated checks, one allowlisted `pnpm`
command.

Production records under `verification/production/evidence/` bind a result to:

- `https://uktest.cc` and the approved production Supabase project;
- the exact deployed commit for release-scoped controls;
- a SHA-256 fingerprint of the control definition and all controlling source files;
- an observation time and maximum age;
- either an exact automated command plus output digest, or a named role reference, exact manual
  attestation and hashed local artifacts.

Raw command output, credentials, personal email addresses, student data and invite codes are not
stored in the ledger. A newer failure overrides an older pass. A target, release, control or source
change invalidates old evidence automatically.

`pnpm production:evidence:audit` is non-blocking and explains every missing or stale control.
`pnpm production:evidence:gate` fails unless all six P0 gates are verified. The existing
`pnpm beta:gate` consumes the same derived result instead of trusting manually edited P0 labels.

Manual evidence can only be recorded through `pnpm production:evidence:record-manual` with the
exact `I_COMPLETED_THIS_PRODUCTION_CONTROL` attestation and at least one hashed artifact. The tool
validates the record; it does not decide whether a reviewer is qualified or perform the review.

## Consequences

- The static readiness file remains a baseline and roadmap, not the live source of production
  truth.
- An earlier conversation, screenshot or successful local test cannot satisfy a production gate.
- Evidence expires and must be rerun after a relevant implementation change or deployment.
- Human and legal controls remain visibly blocked until the responsible person completes them.
- A future dashboard may render this ledger, but no Rust service, additional repository or offline
  PWA is needed for the first Beta.
