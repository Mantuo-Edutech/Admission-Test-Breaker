# Production evidence ledger

This directory stores privacy-safe production verification records. Records are created only by
`pnpm production:evidence:run` or `pnpm production:evidence:record-manual`; do not hand-edit a
passing result.

Automated records contain command identity, source fingerprint, timestamps and an output digest,
but never raw command output or credentials. Manual records require an exact attestation and one or
more local evidence artifacts with SHA-256 hashes. A record becomes stale when its maximum age,
target, deployed release or any controlling source file changes.

Do not place student names, email addresses, invite codes, access tokens, screenshots containing
personal data or other secrets in this directory.
