# TMUA corpus operations

This directory contains generated metadata and reviewed taxonomy files. Raw PDFs remain outside version control under `Tmua/` and are never moved, renamed, or rewritten by the corpus tooling.

## Layers

- `corpus-manifest.json` records the supplied baseline: 96 observed paths grouped into 46 canonical SHA-256 sources.
- `official-resource-registry.json` records the four official 2022/2023 worked-solution supplements separately from that baseline.
- `past-papers/index.json` contains 18 paper records.
- `questions/index.json` contains 360 stable question shells.
- `public-summary.json` is the only filesystem-safe aggregate intended for the website.
- `taxonomy/` contains reviewed knowledge, skill, and error vocabularies.

PDF discovery or indexing does not make a paper playable. Content stages are `discovered`, `indexed`, `extracted`, `verified`, and `published`. Only the existing verified 2023 Paper 1 content is currently published online.

## Commands

Set the raw corpus location when it is outside the current worktree:

```bash
export TMUA_RAW_DIR="/path/to/Tmua"
```

Then use:

```bash
pnpm tmua:inventory
pnpm tmua:sync-official
pnpm tmua:build
pnpm verify:tmua-files
pnpm verify:tmua-taxonomy
pnpm verify:tmua-corpus
```

`tmua:sync-official` is the only command allowed to use the network. It accepts only HTTPS resources on `uat-wp.s3.eu-west-2.amazonaws.com`. The main `pnpm verify` gate remains offline.

Generated writes are atomic. Persisted records must never contain an absolute machine path, parent traversal, or Windows path separator.
