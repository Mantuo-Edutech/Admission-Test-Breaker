# TMUA Corpus Truth Layer and Multi-exam Front Door Implementation Plan

> **For implementers:** Use `superpowers:executing-plans` for inline execution. Use `superpowers:subagent-driven-development` only if the user explicitly authorizes subagents. Complete each checkbox in order and stop on a red verification gate.

**Goal:** Deliver Slice A and Slice B of the approved trust-ladder design: a reproducible, honest TMUA corpus index covering the entire supplied archive, plus a redesigned 满托 multi-exam homepage and a real TMUA exam space that exposes what is available without pretending unfinished content is playable.

**Architecture:** Keep supplied PDFs immutable and ignored under `Tmua/`. A TypeScript corpus CLI scans the imported 96-file baseline, groups 46 canonical sources, reconciles four official supplements, builds 18 paper records and 360 question shells, validates all relations, and emits a small public summary consumed by the React UI. The homepage becomes a pure public-content route; session creation/resume moves to the TMUA exam space. Existing learner-owned 2023 Paper 1 behavior remains unchanged.

**Tech stack:** Node.js 22+, TypeScript 5.9, pnpm, Vitest, Ajv, YAML, Poppler (`pdfinfo`, `pdftotext`), React 19, React Router 7, CSS design tokens, KaTeX, Lucide.

**Approved source of truth:** `docs/superpowers/specs/2026-07-13-admission-test-trust-ladder-design.md`

---

## 1. Scope and non-negotiable boundaries

This plan implements only:

- **Slice A:** TMUA corpus truth layer;
- **Slice B:** brand homepage, four exam entrances, TMUA hub, and honest construction states for ESAT/TARA/UCAT.

This plan does **not** implement:

- the 5-question original preview;
- the 8-question diagnostic or benchmark report;
- Guest Space, account claim, server persistence, RLS, teacher/parent grants, AI interpretation, or payment;
- new playable past papers beyond the already verified 2023 Paper 1;
- extraction or publication of unreviewed mathematical prompts.

The following constraints are release blockers:

1. Never move, rename, delete, or rewrite a supplied file under `Tmua/`.
2. Never commit raw PDFs or persist an absolute `/Users/...` path.
3. Keep the imported baseline separate from official supplements:
   - imported baseline: exactly **96 observed PDF paths / 46 canonical SHA groups**;
   - official supplement registry: the four missing 2022/2023 worked-solution PDFs, stored or linked separately.
4. Exclude `Tmua/official-sources/` from the 96/46 imported baseline count.
5. Treat automatic extraction as unverified. Only the existing 2023 Paper 1 dataset may receive `published` status.
6. A directory named `answer` is not evidence that a PDF contains worked solutions. Classification must use content signatures and explicit audited overrides.
7. The files `2016-2023 answer/tmua-2022.pdf` and `2016-2023 answer/tmua-2023.pdf` are answer keys, not worked solutions.
8. Every generated JSON/Markdown write is atomic: sibling `.tmp`, validation, then rename.
9. `pnpm verify` must remain offline and deterministic. Network access is confined to `tmua:sync-official`.
10. A missing relation, invalid source ID, duplicate stable ID, absolute path, unsafe official URL, count drift, or false `published` status is a P0 failure.

---

## 2. Target file map

```text
src/content/tmua/
├── types.ts                         Expanded corpus/public-summary contracts
├── fs-utils.ts                      Portable discovery and atomic writes
├── pdf-tools.ts                     SHA, pdfinfo and first-page text adapter
├── classify.ts                      Content-aware classification
├── canonicalize.ts                  Duplicate grouping/canonical selection
├── inventory.ts                     96/46 imported corpus builder
├── official-sources.ts              Four-resource allowlisted registry/sync
├── past-papers.ts                   18 paper records and 360 shells
├── taxonomy.ts                      YAML loading and graph validation
├── report.ts                        Human-readable corpus audit
├── verify.ts                        Offline and raw-file validation gates
└── cli.ts                           Agent-runnable commands

content/tmua/
├── README.md
├── corpus-manifest.json             Imported baseline only
├── official-resource-registry.json  Four missing official supplements
├── public-summary.json              UI-safe aggregate, no filesystem paths
├── schemas/
│   ├── source.schema.json
│   ├── official-resource.schema.json
│   ├── paper.schema.json
│   ├── question.schema.json
│   ├── public-summary.schema.json
│   └── taxonomy.schema.json
├── sources/duplicate-map.json
├── past-papers/index.json
├── questions/index.json
└── taxonomy/
    ├── knowledge-tree.yaml
    ├── skill-tags.yaml
    └── error-types.yaml

src/features/catalog/
├── exams.ts                          Four-exam public catalog
├── tmua-summary.ts                   Runtime parser for public-summary.json
└── pages/
    ├── ExamStatusPage.tsx            Honest unopened-exam state
    └── TmuaHubPage.tsx               TMUA journey + archive + session entry

tests/content/tmua/                   Corpus unit/integration tests
tests/features/catalog/               Catalog and public-summary tests
tests/app/                            Homepage, route and TMUA hub tests
docs/content/TMUA_CORPUS_REPORT.md    Generated audit
```

Files to modify or remove:

```text
package.json
src/app/routes.tsx
src/features/practice/pages/LandingPage.tsx
src/features/practice/components/BrandMark.tsx
src/features/practice/components/AcademicIllustration.tsx  remove
src/styles/practice.css
tests/app/landing-page.test.tsx
tests/app/app-shell.test.tsx
docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md
docs/superpowers/specs/2026-07-13-admission-test-trust-ladder-design.md
```

---

## 3. Required data contracts

Extend `src/content/tmua/types.ts` with these exact semantics:

```ts
export type ContentStage =
  | "discovered"
  | "indexed"
  | "extracted"
  | "verified"
  | "published";

export type OfficialAvailability = "linked" | "downloaded";

export interface OfficialResourceRecord {
  id: string;
  edition: string;
  paper: 1 | 2;
  documentType: "worked_solutions";
  officialUrl: string;
  expectedPages: number;
  availability: OfficialAvailability;
  localPath?: string;
  sha256?: string;
  retrievedAt?: string;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
}

export interface PaperRecord {
  id: string;
  edition: string;
  paper: 1 | 2;
  durationMinutes: 75;
  expectedQuestionCount: 20;
  questionSourceId: string;
  answerSourceId: string;
  workedSolutionSourceId: string;
  completeness: "complete" | "incomplete";
  contentStage: ContentStage;
  onlineQuestionCount: number;
  audit: AuditStamp;
}

export interface QuestionRecord {
  id: string;
  exam: "TMUA";
  edition: string;
  paper: 1 | 2;
  questionNumber: number;
  sourceType: "past_paper";
  questionSourceId: string;
  answerSourceId: string;
  workedSolutionSourceId: string;
  prompt: null;
  options: [];
  correctAnswer: null;
  onlineContentId?: string;
  knowledgeTags: string[];
  skillTags: string[];
  errorTypes: string[];
  syllabusLevel: SyllabusLevel;
  contentStage: ContentStage;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
}

export interface TmuaPublicSummary {
  schemaVersion: 1;
  exam: "TMUA";
  auditedAt: string;
  importedPdfPathCount: number;
  canonicalSourceCount: number;
  officialSupplementCount: number;
  paperCount: number;
  questionShellCount: number;
  publishedQuestionCount: number;
  editions: Array<{
    id: string;
    label: string;
    papers: Array<{
      paper: 1 | 2;
      contentStage: ContentStage;
      onlineQuestionCount: number;
    }>;
  }>;
}
```

`CorpusManifest.sources` remains the 46 canonical imported sources. Counting `1 + duplicatePaths.length` across the manifest must equal 96. Official supplements never alter those two figures.

The committed `public-summary.json` must contain only safe aggregate/catalog data. It must not expose raw filenames, hashes, local paths, authorship metadata, or official download locations.

---

## Task 1: Expand corpus contracts and schemas

**Files:**

- Modify: `src/content/tmua/types.ts`
- Modify: `content/tmua/schemas/paper.schema.json`
- Modify: `content/tmua/schemas/question.schema.json`
- Create: `content/tmua/schemas/official-resource.schema.json`
- Create: `content/tmua/schemas/public-summary.schema.json`
- Modify: `tests/content/tmua/schema.test.ts`
- Create: `tests/content/tmua/contracts.test.ts`

- [ ] **Step 1: Write failing contract tests**

Add schema compilation cases for all six schemas. Add representative records that assert:

- an official linked resource may omit `localPath`, `sha256`, and `retrievedAt`;
- a downloaded resource requires all three fields;
- `onlineQuestionCount` is between 0 and 20;
- a question shell always has `prompt: null`, `options: []`, and `correctAnswer: null` in this slice;
- all persisted paths reject absolute paths, `..`, and backslashes;
- `publishedQuestionCount` cannot exceed `questionShellCount`.

Run:

```bash
pnpm test -- tests/content/tmua/schema.test.ts tests/content/tmua/contracts.test.ts
```

Expected: FAIL because the new contracts and schemas do not exist.

- [ ] **Step 2: Implement the types and conditional JSON Schemas**

Use `if/then` in `official-resource.schema.json` so `availability: "downloaded"` requires local path, hash, and retrieval timestamp. Add `minimum: 0`, `maximum: 20` to paper counts. Keep all schemas `additionalProperties: false` except PDF metadata.

- [ ] **Step 3: Run the focused and architecture tests**

```bash
pnpm test -- tests/content/tmua/schema.test.ts tests/content/tmua/contracts.test.ts
pnpm verify:architecture
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content/tmua/types.ts content/tmua/schemas tests/content/tmua
git commit -m "feat: define complete TMUA corpus contracts"
```

---

## Task 2: Build portable PDF discovery and inspection

**Files:**

- Create: `src/content/tmua/fs-utils.ts`
- Create: `src/content/tmua/pdf-tools.ts`
- Create: `tests/content/tmua/fs-utils.test.ts`
- Create: `tests/content/tmua/pdf-tools.test.ts`

**Required interfaces:**

```ts
export function resolveRawRoot(input: {
  cliRawDir?: string;
  envRawDir?: string;
  cwd: string;
}): string;

export function discoverImportedPdfPaths(rawRoot: string): Promise<string[]>;
export function toPortableRawPath(rawRoot: string, absolutePath: string): string;
export function atomicWriteText(path: string, value: string): Promise<void>;

export interface RawPdfFacts {
  absolutePath: string;
  portablePath: string;
  sha256: string;
  fileSize: number;
  metadata: PdfMetadata;
  openingText: string;
}

export function inspectPdf(
  absolutePath: string,
  portablePath: string,
  dependencies?: PdfToolDependencies,
): Promise<RawPdfFacts>;
```

- [ ] **Step 1: Write failing filesystem tests**

Use a temporary directory with nested `.pdf`, `.PDF`, non-PDF, and `official-sources/` files. Assert sorted POSIX-style portable output, symlink rejection, official supplement exclusion, and absolute/parent traversal rejection.

- [ ] **Step 2: Implement discovery and atomic writes**

Resolution precedence is CLI flag, `TMUA_RAW_DIR`, then `<cwd>/Tmua`. `toPortableRawPath` always emits `Tmua/<relative path>` regardless of the physical raw-root location.

- [ ] **Step 3: Write failing PDF adapter tests**

Inject fake `execFile` results for `pdfinfo` and `pdftotext -f 1 -l 2`. Assert normalized metadata keys, SHA-256, byte size, opening text, and a clear error when Poppler is unavailable or page count is invalid.

- [ ] **Step 4: Implement with `node:child_process.execFile`**

Never assemble a shell command. Parse `pdfinfo` line-by-line, preserve optional metadata, require a positive page count, and limit `pdftotext` to the first two pages used for classification.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test -- tests/content/tmua/fs-utils.test.ts tests/content/tmua/pdf-tools.test.ts
git add src/content/tmua/fs-utils.ts src/content/tmua/pdf-tools.ts tests/content/tmua
git commit -m "feat: inspect TMUA PDFs portably"
```

---

## Task 3: Classify documents and select canonical sources

**Files:**

- Create: `src/content/tmua/classify.ts`
- Create: `src/content/tmua/canonicalize.ts`
- Create: `tests/content/tmua/classify.test.ts`
- Create: `tests/content/tmua/canonicalize.test.ts`

**Required functions:**

```ts
export function classifyPdf(facts: RawPdfFacts): {
  provenance: ProvenanceClass;
  documentType: DocumentType;
  edition?: string;
  paper?: 1 | 2;
};

export function groupCanonicalSources(
  facts: RawPdfFacts[],
  audit: AuditStamp,
): SourceRecord[];
```

- [ ] **Step 1: Write failing classification tests from audited facts**

Cover at least these cases:

| Portable path / opening content | Expected classification |
| --- | --- |
| `student textbook.pdf` | `original_teaching / teaching_textbook` |
| `student workbook/student workbook.pdf` | `original_compilation / topic_workbook` |
| `student workbook/tmua workbook answers.pdf` | `original_compilation / answer_map` |
| enhanced logic/proof notes | `official_source / content_specification` |
| historic paper | `official_source / question_paper` |
| one-page option grid | `official_source / answer_key` |
| text headed `Worked Solutions` | `official_source / worked_solutions` |
| `2016-2023 answer/tmua-2022.pdf` with answer-key text | `answer_key`, never `worked_solutions` |
| `2016-2023 answer/tmua-2023.pdf` with answer-key text | `answer_key`, never `worked_solutions` |

Content signature outranks the parent-directory name. Unknown or conflicting inputs must throw a `ClassificationError`; they may not silently become `official_notes`.

- [ ] **Step 2: Implement explicit, reviewable rules**

Keep stable filename overrides in a small constant inside `classify.ts`, with a comment naming the audit date. Parse editions as `specimen`, `practice-2016`, or `2017` through `2023`. Do not infer a calendar year outside the supported edition list.

- [ ] **Step 3: Write failing canonicalization tests**

For equal hashes, assert this order:

1. path without `(1)`;
2. directory matching the detected document type (`answer key/` beats `answer/` for an answer key);
3. shortest portable path;
4. lexicographic tie-break.

Assert one stable semantic source ID per SHA group and no duplicate path loss.

- [ ] **Step 4: Implement and verify**

Source IDs must use forms such as:

```text
tmua-original-student-textbook-v1
tmua-original-topic-workbook-v1
tmua-official-2021-paper-2
tmua-official-2021-paper-2-worked-solutions
tmua-official-2021-answer-key
```

Run:

```bash
pnpm test -- tests/content/tmua/classify.test.ts tests/content/tmua/canonicalize.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/content/tmua/classify.ts src/content/tmua/canonicalize.ts tests/content/tmua
git commit -m "feat: classify and canonicalize TMUA sources"
```

---

## Task 4: Generate and verify the 96/46 imported manifest

**Files:**

- Create: `src/content/tmua/inventory.ts`
- Create: `tests/content/tmua/inventory.test.ts`

**Required interface:**

```ts
export interface InventoryResult {
  manifest: CorpusManifest;
  duplicateMap: Record<string, string>;
}

export function buildImportedInventory(input: {
  rawRoot: string;
  audit: AuditStamp;
  inspect?: typeof inspectPdf;
}): Promise<InventoryResult>;
```

- [ ] **Step 1: Write a failing deterministic inventory test**

Use an injected inspector over fake paths. Assert stable ordering, one source per hash, duplicate map completeness, and invariant:

```ts
manifest.sources.reduce(
  (sum, source) => sum + 1 + source.duplicatePaths.length,
  0,
) === manifest.baseline.pdfCount;
```

Assert rerunning with the same audit timestamp yields byte-equivalent serialized data.

- [ ] **Step 2: Implement inventory construction**

The manifest baseline stays fixed at `{ pdfCount: 96, uniqueContentCount: 46, auditedAt: "2026-07-12" }`. The inventory test therefore supplies 96 fake paths grouped into 46 fake digests; production and tests exercise the same invariant without a hidden test-only API.

- [ ] **Step 3: Add P0 count and path checks**

Fail when any canonical/duplicate path is missing, repeated, absolute, outside `Tmua/`, or when count/digest grouping drifts.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- tests/content/tmua/inventory.test.ts
git add src/content/tmua/inventory.ts tests/content/tmua/inventory.test.ts
git commit -m "feat: build TMUA imported corpus manifest"
```

---

## Task 5: Reconcile the four official worked-solution supplements

**Files:**

- Create: `src/content/tmua/official-sources.ts`
- Create: `tests/content/tmua/official-sources.test.ts`

The static registry contains exactly these official resources:

| ID | Pages | URL |
| --- | ---: | --- |
| `tmua-official-2022-paper-1-worked-solutions` | 25 | `https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2022-paper-1-worked-answers.pdf` |
| `tmua-official-2022-paper-2-worked-solutions` | 25 | `https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2022-paper-2-worked-answers.pdf` |
| `tmua-official-2023-paper-1-worked-solutions` | 22 | `https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2023-paper-1-worked-answers.pdf` |
| `tmua-official-2023-paper-2-worked-solutions` | 23 | `https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2023-paper-2-worked-answers.pdf` |

- [ ] **Step 1: Write failing allowlist/downloader tests**

Assert only HTTPS and exact hostname `uat-wp.s3.eu-west-2.amazonaws.com` are accepted. Reject redirects to another host, a non-2xx response, a non-PDF content type, missing `%PDF-` header, or page-count mismatch. Mock fetch; tests must not use the network.

- [ ] **Step 2: Implement linked and downloaded states**

Before sync, registry records are valid with `availability: "linked"`. On successful sync, atomically write to `Tmua/official-sources/<stable filename>.pdf`, calculate hash/page count, then emit `availability: "downloaded"` with a portable local path and retrieval timestamp.

- [ ] **Step 3: Make sync idempotent**

If a local supplement exists and passes PDF/page/hash inspection, do not download it again. If it is corrupt, fail without overwriting it. Never incorporate these four files into the imported 96/46 inventory.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- tests/content/tmua/official-sources.test.ts
git add src/content/tmua/official-sources.ts tests/content/tmua/official-sources.test.ts
git commit -m "feat: reconcile official TMUA solution supplements"
```

---

## Task 6: Build 18 paper records and 360 stable question shells

**Files:**

- Create: `src/content/tmua/past-papers.ts`
- Create: `tests/content/tmua/past-papers.test.ts`

Use the exact edition order:

```ts
[
  { id: "specimen", label: "Early specimen" },
  { id: "practice-2016", label: "2016 Practice" },
  { id: "2017", label: "2017" },
  { id: "2018", label: "2018" },
  { id: "2019", label: "2019" },
  { id: "2020", label: "2020" },
  { id: "2021", label: "2021" },
  { id: "2022", label: "2022" },
  { id: "2023", label: "2023" },
]
```

- [ ] **Step 1: Write failing count, ID, and relation tests**

Assert:

- exactly 18 papers, two per edition;
- exactly 360 unique question IDs, numbered 1–20 per paper;
- every source relation resolves against the union of imported sources and official resources;
- every paper has question paper, answer key, and worked-solution relation;
- 2022/2023 worked-solution relations resolve to the official supplement registry;
- every shell carries all three source IDs;
- no shell includes auto-extracted prompt/options/answer.

- [ ] **Step 2: Implement honest content stages**

Set all paper/question records to `indexed` and `needs_review`, except the existing `2023 Paper 1`:

- its paper has `contentStage: "published"`, `onlineQuestionCount: 20`;
- its 20 shells have `contentStage: "published"`, `reviewStatus: "verified"`;
- each gets `onlineContentId` matching `tmua-2023-p1-q01` through `q20`;
- all other papers have `onlineQuestionCount: 0`.

Before marking those 20 records published, compare IDs with `tmua2023Paper1.questions` and fail if any are missing or extra.

- [ ] **Step 3: Produce the UI-safe public summary**

Derive, never hand-maintain, `TmuaPublicSummary`. Assert 96 imported paths, 46 canonical sources, 4 official supplements, 18 papers, 360 shells, and 20 published questions.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- tests/content/tmua/past-papers.test.ts tests/features/practice/content/paper.test.ts
git add src/content/tmua/past-papers.ts tests/content/tmua/past-papers.test.ts
git commit -m "feat: index complete TMUA paper archive"
```

---

## Task 7: Establish the first structural taxonomy

**Files:**

- Create: `content/tmua/taxonomy/knowledge-tree.yaml`
- Create: `content/tmua/taxonomy/skill-tags.yaml`
- Create: `content/tmua/taxonomy/error-types.yaml`
- Create: `src/content/tmua/taxonomy.ts`
- Create: `tests/content/tmua/taxonomy.test.ts`

- [ ] **Step 1: Write failing graph-validation tests**

Assert unique stable IDs, existing parents/prerequisites, no self-reference, no cycles, valid `CORE/SUPPORT/EXTENSION`, and nonempty names. Verified/published questions must have tags only when content review has supplied them; unreviewed shells may retain empty arrays.

- [ ] **Step 2: Add the approved first vocabulary**

Knowledge roots:

```text
algebra-and-functions
sequences-and-series
coordinate-geometry
trigonometry
exponentials-and-logarithms
differentiation
integration
graphs-of-functions
mathematical-logic
mathematical-proof
errors-in-proof
gcse-supporting-knowledge
```

Skill tags:

```text
algebraic-transformation
representation-switching
diagram-interpretation
condition-checking
counterexample-construction
necessary-sufficient-reasoning
proof-sequencing
approximation-estimation
option-elimination
multi-step-planning
time-sensitive-calculation
error-detection
```

Error types:

```text
knowledge-gap
invalid-inference
condition-omitted
sign-inequality-reversal
algebraic-manipulation
diagram-misread
calculation-slip
premature-approximation
distractor-attraction
time-pressure-guess
answer-transfer-error
insufficient-evidence
```

- [ ] **Step 3: Implement YAML loading and validation**

Return `ValidationIssue[]`; cycles, duplicate IDs, and broken references are P0. Do not auto-repair taxonomy files.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- tests/content/tmua/taxonomy.test.ts
git add content/tmua/taxonomy src/content/tmua/taxonomy.ts tests/content/tmua/taxonomy.test.ts
git commit -m "feat: add TMUA structural taxonomy"
```

---

## Task 8: Add the offline release gate, CLI, generated records, and audit report

**Files:**

- Create: `src/content/tmua/report.ts`
- Create: `src/content/tmua/verify.ts`
- Create: `src/content/tmua/cli.ts`
- Create: `tests/content/tmua/verify.test.ts`
- Create: `tests/content/tmua/cli.test.ts`
- Create: `content/tmua/README.md`
- Generate: `content/tmua/corpus-manifest.json`
- Generate: `content/tmua/official-resource-registry.json`
- Generate: `content/tmua/public-summary.json`
- Generate: `content/tmua/sources/duplicate-map.json`
- Generate: `content/tmua/past-papers/index.json`
- Generate: `content/tmua/questions/index.json`
- Generate: `docs/content/TMUA_CORPUS_REPORT.md`
- Modify: `package.json`

**CLI contract:**

```text
tmua:inventory       inspect imported PDFs and print/write the 96/46 manifest
tmua:sync-official   network-enabled, allowlisted official supplement sync
tmua:build           offline build from local imported/supplement files
verify:tmua-files    compare committed digests/counts with a supplied raw root
verify:tmua-taxonomy validate taxonomy graph
verify:tmua-corpus   offline schema/count/relation/status/public-summary gate
```

Inventory, sync, build, and raw-file verification accept `--raw-dir`; generation commands accept `--output-dir` and `--audit-at`; raw-dir also accepts `TMUA_RAW_DIR`. Unknown flags and missing values exit nonzero with usage text.

- [ ] **Step 1: Write failing verifier tests**

Create one test per P0 rule: count drift, unsafe path, digest collision with conflicting IDs, unresolved relation, duplicate paper/question ID, wrong question range, false published status, invalid taxonomy, and public-summary mismatch. Assert a clean fixture returns no P0/P1 issues.

- [ ] **Step 2: Write failing CLI tests**

Inject filesystem/network/build dependencies. Assert no command reaches the network except `sync-official`, exit code 1 on P0, atomic output, deterministic ordering, and concise summaries.

- [ ] **Step 3: Implement report and commands**

`TMUA_CORPUS_REPORT.md` must state:

- audit date and raw-root portability policy;
- 96 observed imported paths / 46 canonical sources;
- duplicate count and each canonical group;
- four official supplements with linked/downloaded state;
- 18 papers / 360 shells / 20 currently published questions;
- per-paper question/answer/worked-solution relationship;
- stage legend: discovered, indexed, extracted, verified, published;
- the explicit warning that PDF presence is not online-playable status.

- [ ] **Step 4: Add corpus verification to the main offline gate**

Change `package.json`:

```json
"verify": "pnpm verify:architecture && pnpm verify:tmua-corpus && pnpm test && pnpm typecheck && pnpm build"
```

Do not add `verify:tmua-files` to `pnpm verify`, because CI does not possess the ignored raw PDFs.

- [ ] **Step 5: Run the real raw-corpus pipeline**

```bash
export TMUA_RAW_DIR="/Users/mr616/Documents/Admission-Test Breaker/Tmua"
pnpm run tmua:sync-official --audit-at 2026-07-13T00:00:00.000Z
pnpm run tmua:build --audit-at 2026-07-13T00:00:00.000Z
pnpm run verify:tmua-files --audit-at 2026-07-13T00:00:00.000Z
pnpm verify:tmua-taxonomy
pnpm verify:tmua-corpus
```

Expected final summary:

```text
Imported PDFs: 96
Canonical imported sources: 46
Official supplements: 4
Papers: 18
Question shells: 360
Published online questions: 20
P0: 0
```

- [ ] **Step 6: Scan generated files for machine paths and incomplete markers**

```bash
rg -ni '/Users/|[A-Za-z]:\\\\|to''do|tb''d|place''holder' content/tmua docs/content/TMUA_CORPUS_REPORT.md
```

Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add package.json src/content/tmua content/tmua docs/content/TMUA_CORPUS_REPORT.md tests/content/tmua
git commit -m "feat: generate verified TMUA corpus truth layer"
```

---

## Task 9: Add the four-exam public catalog and routes

**Files:**

- Create: `src/features/catalog/exams.ts`
- Create: `src/features/catalog/pages/ExamStatusPage.tsx`
- Create: `tests/features/catalog/exams.test.ts`
- Create: `tests/app/exam-status-page.test.tsx`
- Modify: `src/app/routes.tsx`

**Catalog contract:**

```ts
export type ExamId = "tmua" | "esat" | "tara" | "ucat";
export type ExamAvailability = "open" | "building";

export interface ExamCatalogEntry {
  id: ExamId;
  name: "TMUA" | "ESAT" | "TARA" | "UCAT";
  purpose: string;
  availability: ExamAvailability;
  statusLabel: string;
  href: string;
}
```

Exact records:

| Exam | Purpose | Status | Route |
| --- | --- | --- | --- |
| TMUA | 数学知识应用与数学推理 | `现已开放` | `/exams/tmua` |
| ESAT | 数学与科学模块化入学测试 | `资料馆建设中` | `/exams/esat` |
| TARA | 批判思维、问题解决与写作 | `资料馆建设中` | `/exams/tara` |
| UCAT | 医学与牙科申请能力测试 | `资料馆建设中` | `/exams/ucat` |

- [ ] **Step 1: Write failing catalog tests**

Assert exactly four unique entries in fixed order and only TMUA is open. Every route must be internal and every building status must have visible text.

- [ ] **Step 2: Write failing unopened-exam route tests**

For ESAT/TARA/UCAT, assert the route renders exam name, purpose, honest construction state, a link back to all exams, and no “开始训练”/fake enabled CTA.

- [ ] **Step 3: Implement catalog and lazy routes**

Keep the catalog in Public Content Domain. Do not import private learner-space, grants, AI, or practice-session modules into `exams.ts` or `ExamStatusPage.tsx`.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- tests/features/catalog/exams.test.ts tests/app/exam-status-page.test.tsx
pnpm verify:architecture
git add src/features/catalog src/app/routes.tsx tests/features/catalog tests/app/exam-status-page.test.tsx
git commit -m "feat: add multi-exam public catalog"
```

---

## Task 10: Redesign the homepage around 满托 and the complete user journey

**Files:**

- Modify: `src/features/practice/pages/LandingPage.tsx`
- Modify: `src/features/practice/components/BrandMark.tsx`
- Delete: `src/features/practice/components/AcademicIllustration.tsx`
- Modify: `src/styles/practice.css`
- Replace assertions in: `tests/app/landing-page.test.tsx`
- Modify: `tests/app/app-shell.test.tsx`

- [ ] **Step 1: Replace old landing tests with the brand/content contract**

Assert the homepage contains:

- brand: `满托考试练习场`;
- secondary name: `Admission Test Breaker`;
- exact H1: `不再为升学考试而焦虑`;
- exact explainer: `从了解考试、诊断水平，到系统训练、模考复盘和准备进度判断，都在这里完成。`;
- question: `你正在准备哪一项考试？`;
- four exam links and visible status text;
- common path in this order: `了解考试 → 完成诊断 → 系统训练 → 模考复盘 → 判断准备进度`.

Assert the page does not contain:

```text
把焦虑，拆成每一道题。
知识不是围墙
内容有出处
结论保持诚实
练习保持开放 · 深度解读与专业服务由你选择
```

Assert landing does not call `store.loadCurrent()` or create a practice session.

- [ ] **Step 2: Implement the university-prospectus visual system**

Use:

- warm paper background from existing tokens;
- a solid 满托 purple editorial band, no gradients;
- serif Chinese headline and publication-style numbering;
- thin rules, aligned baselines, square/low-radius exam entries;
- no illustration, floating decorative copy, glassmorphism, or generic three-card values.

Desktop: four equal exam columns visible in the first screen. iPad: two-by-two. Mobile: one column or compact two-column only if every label remains readable. All links have at least 44px target height and visible `:focus-visible` state.

- [ ] **Step 3: Update BrandMark hierarchy**

Render logo + `满托考试练习场` as primary and `Admission Test Breaker` as secondary. Preserve compact mode used by the exam header.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- tests/app/landing-page.test.tsx tests/app/app-shell.test.tsx
pnpm typecheck
git add src/features/practice/pages/LandingPage.tsx src/features/practice/components/BrandMark.tsx src/features/practice/components/AcademicIllustration.tsx src/styles/practice.css tests/app
git commit -m "feat: redesign Mantou multi-exam homepage"
```

---

## Task 11: Build the TMUA exam space and archive view

**Files:**

- Create: `src/features/catalog/tmua-summary.ts`
- Create: `src/features/catalog/pages/TmuaHubPage.tsx`
- Create: `tests/features/catalog/tmua-summary.test.ts`
- Create: `tests/app/tmua-hub-page.test.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/styles/practice.css`
- Modify: `tests/app/landing-page.test.tsx`

- [ ] **Step 1: Write failing public-summary parser tests**

Import `content/tmua/public-summary.json` through a narrow runtime parser. Reject wrong schema version, wrong exam, non-18 paper count, non-360 shell count, stages outside the enum, or published count inconsistent with editions.

- [ ] **Step 2: Move session behavior tests from homepage to TMUA hub**

The hub must retain all existing behaviors:

- detect and resume an active 2023 Paper 1 session;
- create a learner-owned session before navigation;
- show a calm corrupt-record message;
- continue in memory with recovery warning when persistence is unavailable.

The homepage no longer performs these actions.

- [ ] **Step 3: Add honest TMUA journey actions**

Render in order:

1. `先做 5 道题，看看 TMUA 有多难` with visible `即将开放` and no enabled navigation;
2. `完成约 30 分钟初步诊断` with visible `即将开放` and no enabled navigation;
3. current `2023 Paper 1` full practice start/resume action;
4. anchor to `历年真题资料馆`;
5. `哪些学校和专业需要 TMUA` with visible `申请要求整理中` until Slice D.

Do not label preview, diagnostic, or admissions registry as open in this slice.

- [ ] **Step 4: Render the complete archive truthfully**

Show aggregate facts `18 套试卷`, `360 道题目档案`, `20 道已可在线练习`, plus all nine editions and two papers each. Status labels map exactly:

| Stage | Chinese label |
| --- | --- |
| `discovered` | 已发现 |
| `indexed` | 已建立档案 |
| `extracted` | 已结构化，待核验 |
| `verified` | 已核验 |
| `published` | 可在线练习 |

Only the 2023 Paper 1 row links to `/practice/tmua-2023-paper-1`. Other rows are non-clickable and explain that the source relation exists but the online question content is not yet verified.

- [ ] **Step 5: Verify route and session compatibility**

```bash
pnpm test -- tests/features/catalog/tmua-summary.test.ts tests/app/tmua-hub-page.test.tsx tests/app/practice-page.test.tsx tests/app/results-page.test.tsx
pnpm verify:architecture
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/features/catalog src/app/routes.tsx src/styles/practice.css tests/features/catalog tests/app
git commit -m "feat: add honest TMUA exam and archive space"
```

---

## Task 12: Verify responsive behavior, accessibility, and visual direction

**Files:**

- Create: `tests/app/front-door-accessibility.test.tsx`
- Create: `tests/app/front-door-css-contract.test.ts`
- Modify if failures require: `src/styles/practice.css`, affected page/component files

- [ ] **Step 1: Add semantic interaction tests**

Assert one H1 per page, meaningful link/button names, building states expressed in text, no disabled action implemented as a misleading link, keyboard-focusable exam entries, archive table/list landmarks, and no image without alt text.

- [ ] **Step 2: Add a small CSS contract test**

Read `src/styles/practice.css` and assert it contains:

- four-column desktop exam grid;
- two-column tablet breakpoint;
- mobile layout breakpoint;
- `min-height: 44px` or larger on exam entry controls;
- `:focus-visible` styling;
- no `linear-gradient` inside the new landing/catalog selector block.

This test protects explicit design constraints; it does not replace visual review.

- [ ] **Step 3: Run visual checks at approved viewports**

Start:

```bash
pnpm dev --host 127.0.0.1
```

Inspect `/` and `/exams/tmua` at:

- 390 × 844;
- 820 × 1180;
- 1180 × 820;
- 1440 × 1000.

At every viewport verify: slogan visible, four exams identifiable without horizontal scrolling, no clipped Chinese/English brand text, status not color-only, 44px touch targets, archive readable, and no regression in the 2023 Paper 1 practice route.

- [ ] **Step 4: Run tests and commit any corrections**

```bash
pnpm test -- tests/app/front-door-accessibility.test.tsx tests/app/front-door-css-contract.test.ts
pnpm typecheck
git add src tests
git commit -m "fix: harden responsive exam front door"
```

If visual review produces no changes, do not create an empty commit.

---

## Task 13: Synchronize architecture/status documentation and run the complete release gate

**Files:**

- Modify: `docs/superpowers/specs/2026-07-13-admission-test-trust-ladder-design.md`
- Modify: `docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md`
- Modify if implementation diverged: `docs/architecture/SYSTEM_ARCHITECTURE.md`

- [ ] **Step 1: Record completed status without overstating later slices**

Mark the approved design `已批准，实施中`. In the roadmap, mark Slice A/B delivered only after their tests pass. Leave Slice C/D pending. State explicitly that 2023 Paper 1 remains the only verified/published online past paper.

- [ ] **Step 2: Run plan/spec consistency scans**

```bash
rg -ni 'to''do|tb''d|place''holder|待''定|假''设实现' docs/superpowers/plans/2026-07-13-tmua-corpus-and-multi-exam-front-door.md docs/superpowers/specs/2026-07-13-admission-test-trust-ladder-design.md
rg -n '/Users/|[A-Za-z]:\\\\' content/tmua docs/content/TMUA_CORPUS_REPORT.md
```

Expected: no incomplete markers and no machine-specific paths in generated artifacts. The plan itself may contain the explicit local command path only in its execution example; the artifact scan excludes the plan.

- [ ] **Step 3: Run the full gate from a clean process**

```bash
pnpm verify
git status --short
```

Expected: architecture, corpus, all Vitest suites, TypeScript, and Vite build pass. Git status contains only intentional documentation updates before the final commit.

- [ ] **Step 4: Commit documentation**

```bash
git add docs
git commit -m "docs: record TMUA corpus and front door delivery"
```

- [ ] **Step 5: Final implementation audit**

```bash
git log --oneline --max-count=15
git diff HEAD~1 --check
pnpm verify
```

Report exact final test counts and any honest limitations. Do not claim Slice C/D, production privacy, benchmark calibration, or multi-tenant server storage as complete.

---

## 4. Acceptance checklist

Slice A/B are complete only when all are true:

- [ ] Supplied archive remains untouched.
- [ ] Imported manifest proves 96 observed paths and 46 canonical SHA groups.
- [ ] Duplicate map preserves every supplied path.
- [ ] Four 2022/2023 worked-solution links/downloads are official, allowlisted, and page-checked.
- [ ] 2022/2023 answer-key PDFs are not misclassified as worked solutions.
- [ ] Past-paper index contains exactly 18 papers.
- [ ] Question index contains exactly 360 stable shells.
- [ ] Only 2023 Paper 1's 20 questions are marked published/verified.
- [ ] Public UI summary exposes no filesystem paths or hashes.
- [ ] Homepage first screen communicates 满托, the exact slogan, complete product journey, and four exams.
- [ ] TMUA is the first open exam, not the platform's master brand.
- [ ] ESAT/TARA/UCAT show honest construction states and no fake training CTA.
- [ ] TMUA hub preserves start/resume/recovery for the existing 2023 Paper 1.
- [ ] TMUA archive shows all 18 paper states and only one playable row.
- [ ] Phone, iPad landscape/portrait, and desktop layouts are usable.
- [ ] `pnpm verify` independently enforces architecture + corpus + tests + types + build.
- [ ] Documentation distinguishes delivered Slice A/B from pending Slice C/D.

## 5. Next plan after this delivery

The next implementation plan begins only after the five original preview items have:

1. a signed-off blueprint covering Paper 1 application and Paper 2 reasoning;
2. unique-answer and numerical/formal verification;
3. reviewed solutions and distractor rationales;
4. an independent human review record;
5. approved revision IDs and publication status.

That plan will cover Slice C (5-question preview + versioned Guest Space). Slice D (8-question diagnostic, free evidence report, and 2027 admissions registry) remains a separate release because it has independent content, privacy, calibration, and source-verification gates.
