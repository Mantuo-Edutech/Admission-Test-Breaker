# Manual review decision ledger

This directory stores machine-validated review decisions. A decision is release evidence,
not an automated test result. It is accepted only when it targets a current review item,
matches the exact source fingerprint, uses the required owner role, records qualified
reviewers, attaches hashed local evidence and includes an explicit attestation.

Use `pnpm review:prepare -- --review-key <feature/check> --output <directory>` to create a
review packet. After the review report is complete under `verification/reviews/evidence/`,
use `pnpm review:record -- --input <decision-draft.json>` to validate and record the
decision. Never place student names, contact details or raw student responses in a record.

Historical decisions may remain in this directory. A source change makes them stale and
therefore unable to release the current version; it does not rewrite history.
