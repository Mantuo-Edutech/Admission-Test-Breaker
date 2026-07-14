# TMUA extraction staging

This directory contains machine-generated, directly importable question bundles derived from the read-only PDF corpus.

Every generated question remains `contentStage: extracted` and `reviewStatus: needs_review`. Layout text is evidence for editing and review; it is not safe for student-facing publication because PDF font mappings, mathematical notation, figures and vertically arranged fractions may require transcription.

Generate one paper from a local raw corpus:

```bash
pnpm tmua:extract-paper \
  --paper-id tmua-2022-p1 \
  --raw-dir "/absolute/path/to/Tmua" \
  --audit-at 2026-07-14T00:00:00.000Z
```

The output contains:

- `bundle.json`: one upload-ready paper bundle;
- `questions/*.json`: one reviewable revision per question;
- `extraction-report.json`: counts, warnings and the non-publishable boundary.

The source PDF is never modified, copied into this directory or embedded as an absolute local path.
