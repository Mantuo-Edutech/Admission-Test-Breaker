# Experience correction loop

This project treats a reported interface problem as evidence of a reusable system
gap, not as an isolated screenshot fix.

## Correction sequence

1. Reproduce the issue at the shared component or data-model boundary.
2. Classify it as design-system, domain-data, content, accessibility, or device-layout.
3. Add a regression assertion at the lowest reusable boundary.
4. Fix the shared rule before applying page-specific exceptions.
5. Verify the affected exam matrix and phone, tablet, and desktop layouts.
6. Keep the student-facing report link on every question so the next example enters
   the same loop with exam, paper, question, and device context attached.

## Required checks for question or profile changes

Run:

```bash
pnpm verify:experience-system
pnpm typecheck
pnpm build
pnpm verify:web-performance
```

For question-layout changes, also run the relevant Playwright journey and check:

- every choice remains at least 44 px high;
- a normal four-choice question fits in a 900 px desktop viewport;
- long copy wraps without horizontal overflow on phone and tablet;
- formulae and scalar numbers keep a consistent academic typeface;
- figures retain their aspect ratio and are never cropped.

For curriculum-profile changes, verify every supported curriculum against its own
course catalogue. A curriculum switch must clear incompatible selections, and old
profiles must migrate without inventing unsupported course combinations.
