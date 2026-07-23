# Official research assets

This directory separates provenance from publication.

- `exam-source-registry.json` records a small, product-facing provenance set.
- `curriculum-source-registry.json` records the exact IB/AP curriculum versions
  used by the deterministic TMUA coverage map, including an honest distinction
  between locally downloaded files and origin-blocked files.
- `research-asset-inventory.json` records the full preparation-material research snapshot.
- `raw/professional-standards/` stores internal professional-standards anchors used to audit original UCAT SJT topic coverage; these are not UCAT answer keys and do not validate Mantou scoring decisions.
- `raw/` contains downloaded official pages and files for internal research. It is Git-ignored and must never be copied into `public/`, `dist/`, a public object-store bucket, or an open-source release.

## Rights boundary

Download does not mean publication clearance. Every raw asset remains:

- `publishable: false`;
- restricted to the rights status recorded in the inventory;
- blocked from product delivery until written permission or a separate legal review explicitly clears the proposed use.

Original Mantou notes may use official structural facts and topic ranges as sources, but must be independently written, source-cited and checked for excessive similarity. Official questions, answer explanations, illustrations and page layouts must not be copied into paid notes merely because a local raw file exists.

## Commands

```bash
pnpm official:sync-research
pnpm verify:official-research
pnpm verify:curriculum-sources
pnpm verify:curriculum-files
```

`verify:curriculum-sources` is safe in a clean CI checkout and verifies the
version, official URL, qualification linkage and rights boundary. The stricter
`verify:curriculum-files` command is for the internal research workspace: it
also requires every record marked `downloaded` to exist locally with the exact
PDF header, byte size and SHA-256 digest.

The sync command snapshots the configured official preparation pages, discovers their downloadable PDF/RTF assets, downloads them to `raw/`, and writes URL, source page, SHA-256, byte size and rights status into the inventory. The verify command performs no network requests and checks the local files against that inventory.
