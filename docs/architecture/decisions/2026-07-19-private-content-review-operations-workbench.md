# ADR: Private content-review operations workbench

## Background

The release gate already converted 40 public content products into 68 source-bound manual
review groups, but execution required repository commands and JSON editing. That was safe
for the release gate and unusable for most teachers. Moving final human approval into the
browser would make the opposite mistake: a public client could appear to sign or publish
content without the versioned evidence ledger.

## Options

1. Keep the whole workflow in the command line. This preserves evidence integrity but
   leaves non-technical reviewers dependent on a developer for every review step.
2. Let the browser record final approvals. This is convenient but weakens source,
   evidence-hash and repository-release boundaries.
3. Serve the current queue privately, let approved reviewers open real product routes and
   prepare review packets in the browser, but keep final attestation and publication in the
   versioned decision ledger.

## Decision

Use option 3.

- A separate, service-role-managed `content_review_viewer` capability grants only
  `view_content_review_queue` and `prepare_review_packet`.
- The generated worklist is transactionally synchronized into private Supabase tables.
  Each row retains the catalog revision, current source fingerprint, source count, product
  versions and internal routes. Invalid input rolls the whole synchronization back.
- `/operations/content-review` can filter the queue, open the actual product and download
  a Markdown evidence template plus an unattested `changes-requested` decision draft.
- The browser has no approve or publish RPC. A content lead must still validate the final
  evidence with `review:record`; the existing ledger pins evidence by SHA-256 and rejects
  stale sources.

## Impact

Teachers can execute a consistent review without understanding the repository structure,
while automation still cannot impersonate a human approval. Production must explicitly
sync the queue and grant MFA-protected reviewer accounts. The workbench improves
operability but does not change the honest current result of 0/40 Beta-approved products.
