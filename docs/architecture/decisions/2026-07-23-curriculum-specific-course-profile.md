# Curriculum-specific course profiles

Date: 2026-07-23

## Decision

TARA, LNAT and UCAT student profiles store the exact course selections for the
chosen curriculum, in addition to the broad subject areas used by deterministic
preparation rules.

The profile UI must obtain its options from one typed course catalogue:

- A-Level / IAL shows A-Level subjects;
- IB shows named IBDP courses and the relevant HL / SL distinction;
- AP shows named AP courses;
- other systems use neutral subject names.

Profile schema version 2 adds `courseIds`. Broad `subjectAreas` are derived from
those course IDs and are never independently guessed by the page. A version 1
profile is migrated deterministically on read and then written to the version 2
storage key. Supabase validates the same curriculum/course boundary.

## Why

The previous profile displayed one broad, A-Level-shaped subject list for every
curriculum. It could identify a rough preparation area, but it could not tell an
IB Mathematics AA HL learner from an AP Calculus BC learner. Exact course
identity is required for credible coverage analysis and future visualisation.

## Verification

The course catalogue has matrix tests for every supported curriculum. UI tests
switch curricula and assert that stale options disappear. Domain, local-store,
Supabase-contract and preparation-plan tests verify validation, migration,
tenant-safe persistence and exact course evidence.
