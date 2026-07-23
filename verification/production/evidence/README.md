# Production evidence ledger

This directory stores privacy-safe production verification records. Records are created only by
`pnpm production:evidence:run` or `pnpm production:evidence:record-manual`; do not hand-edit a
passing result.

Every manual control first requires a structured report generated with
`pnpm production:evidence:prepare-manual -- --control <control-id> --output
verification/production/evidence/artifacts/<privacy-safe-name>.json`. The generated report is
failed by default. A tester changes a check to `passed` only after observing the expected result in
production, removes all personal data and credentials, and supplies the report with `--report`.
The recorder rejects missing checks, the wrong target or release, contradictory results and common
sensitive values. Supplementary redacted material can be attached separately with `--artifact`.

Automated records contain command identity, source fingerprint, timestamps and an output digest,
but never raw command output or credentials. Manual records require an exact attestation and one or
more local evidence artifacts with SHA-256 hashes. A record becomes stale when its maximum age,
target, deployed release or any controlling source file changes.

Do not place student names, email addresses, invite codes, access tokens, screenshots containing
personal data or other secrets in this directory.
