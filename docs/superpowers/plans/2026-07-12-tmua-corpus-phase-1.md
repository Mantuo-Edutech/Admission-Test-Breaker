# TMUA Corpus Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible, agent-runnable Phase 1 corpus foundation that inventories every local TMUA PDF, identifies duplicates, fills official-source gaps, indexes all historic paper sets, establishes the first taxonomy, and blocks invalid corpus releases.

**Architecture:** Keep `Tmua/` as an immutable raw layer and generate portable, repository-relative records under `content/tmua/`. A small TypeScript CLI performs deterministic scanning, hashing, classification, official downloads, index generation, taxonomy validation, and report generation; Vitest tests each boundary independently before the real corpus is processed.

**Tech Stack:** Node.js 22+, TypeScript, pnpm, Vitest, Ajv JSON Schema validation, YAML, Poppler `pdfinfo`/`pdftoppm`, built-in Fetch API and Web Crypto/Node Crypto.

## Global Constraints

- Do not move, rename, delete, or rewrite any existing file under `Tmua/`.
- Keep all generated paths repository-relative; never persist `/Users/...` or another absolute machine path.
- The 2026-07-12 baseline is 96 PDFs and 46 unique SHA-256 contents.
- The expected historic corpus is 18 papers and 360 question slots: Specimen, 2016 Practice, and 2017-2023, each with Paper 1 and Paper 2.
- Store new official PDFs only under `Tmua/official-sources/` and download only from `uat-wp.s3.eu-west-2.amazonaws.com`.
- Do not commit any raw PDF in this phase; commit tooling, manifests, taxonomy, schemas, reports, and download provenance only.
- Do not scrape or reproduce Pearson test-player questions; record the current Pearson practice page as link-only.
- Treat automatic extraction as unverified. Phase 1 creates document and paper records, not publishable question text.
- A digest mismatch, duplicate stable ID, broken source link, conflicting classification, missing canonical file, or invalid taxonomy is a P0 blocking failure.
- Every write of generated JSON or Markdown must be atomic: write a sibling `.tmp` file and rename it only after successful serialization.
- Use the approved design at `docs/superpowers/specs/2026-07-12-tmua-content-corpus-design.md` as the source of truth.

---

## Planned File Map

```text
package.json                         Content tooling commands only
tsconfig.json                        TypeScript configuration
vitest.config.ts                     Test configuration
src/content/tmua/types.ts            Shared corpus types and stable enums
src/content/tmua/fs-utils.ts         Atomic writes and recursive PDF discovery
src/content/tmua/pdf-metadata.ts     SHA-256 and pdfinfo adapter
src/content/tmua/canonicalize.ts     Duplicate grouping and canonical-path rules
src/content/tmua/classify.ts         Path/metadata to provenance and document type
src/content/tmua/inventory.ts        Source manifest generation
src/content/tmua/official-sources.ts Allowlisted official resource registry/downloader
src/content/tmua/past-papers.ts      Eighteen-paper reconciliation
src/content/tmua/taxonomy.ts         YAML parsing and structural validation
src/content/tmua/report.ts           Human-readable corpus report
src/content/tmua/verify.ts           P0/P1 validation aggregation
src/content/tmua/cli.ts              Agent-facing commands and exit codes
content/tmua/schemas/*.json          JSON Schemas
content/tmua/taxonomy/*.yaml         Knowledge, skill, and error taxonomies
content/tmua/**/*.json               Generated manifests and indexes
content/tmua/README.md                Corpus operating guide
docs/content/TMUA_CORPUS_REPORT.md   Generated audit report
tests/content/tmua/*.test.ts         Unit and integration tests
```

## Task 1: Establish the Typed Content-Tooling Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/content/tmua/types.ts`
- Create: `content/tmua/schemas/source.schema.json`
- Create: `content/tmua/schemas/paper.schema.json`
- Create: `content/tmua/schemas/question.schema.json`
- Create: `content/tmua/schemas/taxonomy.schema.json`
- Create: `tests/content/tmua/schema.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `SourceRecord`, `PaperRecord`, `QuestionRecord`, `TaxonomyNode`, `ValidationIssue`, and four compilable JSON Schemas.

- [ ] **Step 1: Create package configuration and install locked dependencies**

Create `package.json`:

```json
{
  "name": "admission-test-breaker",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "tmua:inventory": "tsx src/content/tmua/cli.ts inventory",
    "tmua:sync-official": "tsx src/content/tmua/cli.ts sync-official",
    "tmua:build": "tsx src/content/tmua/cli.ts build",
    "verify:tmua-files": "tsx src/content/tmua/cli.ts verify-files",
    "verify:tmua-taxonomy": "tsx src/content/tmua/cli.ts verify-taxonomy",
    "verify:tmua-corpus": "tsx src/content/tmua/cli.ts verify-corpus"
  }
}
```

Run:

```bash
pnpm add ajv ajv-formats yaml
pnpm add --save-dev typescript tsx vitest @types/node
```

Expected: `pnpm-lock.yaml` is created and `pnpm install --frozen-lockfile` succeeds.

- [ ] **Step 2: Create TypeScript and Vitest configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
```

- [ ] **Step 3: Write the failing schema-compilation test**

Create `tests/content/tmua/schema.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

const schemaFiles = ["source", "paper", "question", "taxonomy"] as const;

describe("TMUA JSON Schemas", () => {
  it.each(schemaFiles)("compiles %s.schema.json", async (name) => {
    const text = await readFile(`content/tmua/schemas/${name}.schema.json`, "utf8");
    const schema = JSON.parse(text);
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    expect(() => ajv.compile(schema)).not.toThrow();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test -- tests/content/tmua/schema.test.ts`

Expected: FAIL because the four schema files do not exist.

- [ ] **Step 5: Add shared types**

Create `src/content/tmua/types.ts`:

```ts
export const provenanceClasses = [
  "original_teaching",
  "original_compilation",
  "official_source",
  "licensed_external",
] as const;
export type ProvenanceClass = (typeof provenanceClasses)[number];

export const documentTypes = [
  "teaching_textbook",
  "topic_workbook",
  "answer_map",
  "question_paper",
  "answer_key",
  "worked_solutions",
  "content_specification",
  "official_notes",
  "link_only",
] as const;
export type DocumentType = (typeof documentTypes)[number];

export type ReviewStatus =
  | "not_started"
  | "auto_extracted"
  | "needs_review"
  | "verified"
  | "rejected";

export type SyllabusLevel = "CORE" | "SUPPORT" | "EXTENSION";

export interface AuditStamp {
  generatedAt: string;
  generatedBy: "tmua-corpus-cli";
  schemaVersion: 1;
  changeReason: string;
}

export interface PdfMetadata {
  pages: number;
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
}

export interface SourceRecord {
  id: string;
  canonicalPath: string;
  duplicatePaths: string[];
  sha256: string;
  fileSize: number;
  metadata: PdfMetadata;
  provenance: ProvenanceClass;
  documentType: DocumentType;
  edition?: string;
  paper?: 1 | 2;
  officialUrl?: string;
  retrievedAt?: string;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
}

export interface CorpusManifest {
  schemaVersion: 1;
  generatedAt: string;
  baseline: { pdfCount: 96; uniqueContentCount: 46; auditedAt: "2026-07-12" };
  sources: SourceRecord[];
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
  audit: AuditStamp;
}

export interface QuestionRecord {
  id: string;
  exam: "TMUA";
  edition: string;
  paper: 1 | 2;
  questionNumber: number;
  knowledgeTags: string[];
  skillTags: string[];
  errorTypes: string[];
  syllabusLevel: SyllabusLevel;
  reviewStatus: ReviewStatus;
  audit: AuditStamp;
}

export interface TaxonomyNode {
  id: string;
  name: string;
  parentId: string | null;
  level: SyllabusLevel;
  specificationRefs: string[];
  prerequisites: string[];
  aliases: string[];
}

export interface ValidationIssue {
  severity: "P0" | "P1" | "P2";
  code: string;
  message: string;
  path?: string;
}
```

- [ ] **Step 6: Add all four JSON Schemas**

Create `content/tmua/schemas/source.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "canonicalPath", "duplicatePaths", "sha256", "fileSize", "metadata", "provenance", "documentType", "reviewStatus", "audit"],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "canonicalPath": { "type": "string", "pattern": "^(?!/)" },
    "duplicatePaths": { "type": "array", "items": { "type": "string", "pattern": "^(?!/)" }, "uniqueItems": true },
    "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "fileSize": { "type": "integer", "minimum": 1 },
    "metadata": { "type": "object", "required": ["pages"], "properties": { "pages": { "type": "integer", "minimum": 1 } }, "additionalProperties": true },
    "provenance": { "enum": ["original_teaching", "original_compilation", "official_source", "licensed_external"] },
    "documentType": { "enum": ["teaching_textbook", "topic_workbook", "answer_map", "question_paper", "answer_key", "worked_solutions", "content_specification", "official_notes", "link_only"] },
    "edition": { "type": "string" },
    "paper": { "enum": [1, 2] },
    "officialUrl": { "type": "string", "format": "uri" },
    "retrievedAt": { "type": "string" },
    "reviewStatus": { "enum": ["not_started", "auto_extracted", "needs_review", "verified", "rejected"] },
    "audit": { "type": "object", "required": ["generatedAt", "generatedBy", "schemaVersion", "changeReason"], "properties": { "generatedAt": { "type": "string" }, "generatedBy": { "const": "tmua-corpus-cli" }, "schemaVersion": { "const": 1 }, "changeReason": { "type": "string", "minLength": 1 } }, "additionalProperties": false }
  },
  "additionalProperties": false
}
```

Create `content/tmua/schemas/paper.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "edition", "paper", "durationMinutes", "expectedQuestionCount", "questionSourceId", "answerSourceId", "workedSolutionSourceId", "completeness", "audit"],
  "properties": {
    "id": { "type": "string", "pattern": "^tmua-.+-p[12]$" },
    "edition": { "type": "string" },
    "paper": { "enum": [1, 2] },
    "durationMinutes": { "const": 75 },
    "expectedQuestionCount": { "const": 20 },
    "questionSourceId": { "type": "string", "minLength": 1 },
    "answerSourceId": { "type": "string", "minLength": 1 },
    "workedSolutionSourceId": { "type": "string", "minLength": 1 },
    "completeness": { "enum": ["complete", "incomplete"] },
    "audit": { "type": "object", "required": ["generatedAt", "generatedBy", "schemaVersion", "changeReason"], "properties": { "generatedAt": { "type": "string" }, "generatedBy": { "const": "tmua-corpus-cli" }, "schemaVersion": { "const": 1 }, "changeReason": { "type": "string", "minLength": 1 } }, "additionalProperties": false }
  },
  "additionalProperties": false
}
```

Create `content/tmua/schemas/question.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "exam", "edition", "paper", "questionNumber", "knowledgeTags", "skillTags", "errorTypes", "syllabusLevel", "reviewStatus", "audit"],
  "properties": {
    "id": { "type": "string", "pattern": "^tmua-.+-p[12]-q(0[1-9]|1[0-9]|20)$" },
    "exam": { "const": "TMUA" },
    "edition": { "type": "string" },
    "paper": { "enum": [1, 2] },
    "questionNumber": { "type": "integer", "minimum": 1, "maximum": 20 },
    "knowledgeTags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
    "skillTags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
    "errorTypes": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
    "syllabusLevel": { "enum": ["CORE", "SUPPORT", "EXTENSION"] },
    "reviewStatus": { "enum": ["not_started", "auto_extracted", "needs_review", "verified", "rejected"] },
    "audit": { "type": "object", "required": ["generatedAt", "generatedBy", "schemaVersion", "changeReason"], "properties": { "generatedAt": { "type": "string" }, "generatedBy": { "const": "tmua-corpus-cli" }, "schemaVersion": { "const": 1 }, "changeReason": { "type": "string", "minLength": 1 } }, "additionalProperties": false }
  },
  "additionalProperties": false
}
```

Create `content/tmua/schemas/taxonomy.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "name", "parentId", "level", "specificationRefs", "prerequisites", "aliases"],
    "properties": {
      "id": { "type": "string", "pattern": "^[a-z0-9._-]+$" },
      "name": { "type": "string", "minLength": 1 },
      "parentId": { "type": ["string", "null"] },
      "level": { "enum": ["CORE", "SUPPORT", "EXTENSION"] },
      "specificationRefs": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
      "prerequisites": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
      "aliases": { "type": "array", "items": { "type": "string" }, "uniqueItems": true }
    },
    "additionalProperties": false
  }
}
```

- [ ] **Step 7: Run schema tests and typecheck**

Run:

```bash
pnpm test -- tests/content/tmua/schema.test.ts
pnpm typecheck
```

Expected: both commands PASS.

- [ ] **Step 8: Commit the typed harness**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vitest.config.ts src/content/tmua/types.ts content/tmua/schemas tests/content/tmua/schema.test.ts
git commit -m "build: add typed TMUA content tooling"
```

## Task 2: Scan PDFs, Extract Metadata, and Select Canonical Files

**Files:**
- Create: `src/content/tmua/fs-utils.ts`
- Create: `src/content/tmua/pdf-metadata.ts`
- Create: `src/content/tmua/canonicalize.ts`
- Create: `tests/content/tmua/inventory-primitives.test.ts`

**Interfaces:**
- Consumes: `PdfMetadata` from Task 1.
- Produces: `findPdfFiles(rootDir)`, `sha256File(path)`, `readPdfMetadata(path)`, `groupByDigest(scanned)`, `chooseCanonical(paths)`, and `atomicWrite(path, content)`.

- [ ] **Step 1: Write failing primitive tests**

Create `tests/content/tmua/inventory-primitives.test.ts`:

```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chooseCanonical, groupByDigest } from "../../../src/content/tmua/canonicalize.js";
import { findPdfFiles } from "../../../src/content/tmua/fs-utils.js";
import { sha256File } from "../../../src/content/tmua/pdf-metadata.js";

describe("inventory primitives", () => {
  it("finds PDFs recursively in stable order", async () => {
    const root = await mkdtemp(join(tmpdir(), "tmua-files-"));
    await writeFile(join(root, "b.pdf"), "b");
    await writeFile(join(root, "a.pdf"), "a");
    await writeFile(join(root, "ignore.txt"), "x");
    expect(await findPdfFiles(root)).toEqual(["a.pdf", "b.pdf"]);
  });

  it("groups byte-identical files and prefers a path without (1)", async () => {
    const root = await mkdtemp(join(tmpdir(), "tmua-hash-"));
    const first = join(root, "paper.pdf");
    const copy = join(root, "paper(1).pdf");
    await writeFile(first, "same bytes");
    await writeFile(copy, "same bytes");
    const digest = await sha256File(first);
    const groups = groupByDigest([
      { relativePath: "paper(1).pdf", sha256: digest },
      { relativePath: "paper.pdf", sha256: digest },
    ]);
    expect(groups).toHaveLength(1);
    expect(chooseCanonical(groups[0]!.paths)).toBe("paper.pdf");
  });

  it("prefers the semantically correct answer-key directory", () => {
    expect(chooseCanonical([
      "2016-2023 answer/tmua-2023.pdf",
      "2016-2023 answer key/tmua-2023.pdf",
    ])).toBe("2016-2023 answer key/tmua-2023.pdf");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/content/tmua/inventory-primitives.test.ts`

Expected: FAIL because the imported modules do not exist.

- [ ] **Step 3: Implement file discovery and atomic writes**

Create `src/content/tmua/fs-utils.ts`:

```ts
import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

export async function findPdfFiles(rootDir: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        found.push(relative(rootDir, absolute).split("\\").join("/"));
      }
    }
  }
  await walk(rootDir);
  return found.sort((a, b) => a.localeCompare(b, "en"));
}

export async function atomicWrite(path: string, content: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}
```

- [ ] **Step 4: Implement SHA-256 and `pdfinfo` parsing**

Create `src/content/tmua/pdf-metadata.ts`:

```ts
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { promisify } from "node:util";
import type { PdfMetadata } from "./types.js";

const execFile = promisify(execFileCallback);

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

export async function readPdfMetadata(path: string): Promise<PdfMetadata> {
  const { stdout } = await execFile("pdfinfo", ["-isodates", path], { maxBuffer: 4 * 1024 * 1024 });
  const fields = new Map<string, string>();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) fields.set(match[1]!.trim(), match[2]!.trim());
  }
  const pages = Number(fields.get("Pages"));
  if (!Number.isInteger(pages) || pages < 1) throw new Error(`Invalid PDF page count for ${path}`);
  const optional = (name: string) => fields.get(name) || undefined;
  return {
    pages,
    title: optional("Title"),
    author: optional("Author"),
    creator: optional("Creator"),
    producer: optional("Producer"),
    creationDate: optional("CreationDate"),
  };
}
```

- [ ] **Step 5: Implement duplicate grouping and canonical selection**

Create `src/content/tmua/canonicalize.ts`:

```ts
export interface DigestPath { relativePath: string; sha256: string }

export function groupByDigest(files: DigestPath[]): Array<{ sha256: string; paths: string[] }> {
  const groups = new Map<string, string[]>();
  for (const file of files) groups.set(file.sha256, [...(groups.get(file.sha256) ?? []), file.relativePath]);
  return [...groups.entries()]
    .map(([sha256, paths]) => ({ sha256, paths: paths.sort() }))
    .sort((a, b) => a.sha256.localeCompare(b.sha256));
}

export function chooseCanonical(paths: string[]): string {
  if (paths.length === 0) throw new Error("Cannot choose a canonical path from an empty group");
  const semanticRank = (path: string) => {
    if (path.includes("2016-2023 answer key/")) return 0;
    if (path.includes("2016-2023 answer/")) return 1;
    return 0;
  };
  return [...paths].sort((a, b) => {
    const aCopy = /\(1\)\.pdf$/i.test(a) ? 1 : 0;
    const bCopy = /\(1\)\.pdf$/i.test(b) ? 1 : 0;
    return aCopy - bCopy || semanticRank(a) - semanticRank(b) || a.localeCompare(b, "en");
  })[0]!;
}
```

- [ ] **Step 6: Run tests and typecheck**

Run:

```bash
pnpm test -- tests/content/tmua/inventory-primitives.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit inventory primitives**

```bash
git add src/content/tmua/fs-utils.ts src/content/tmua/pdf-metadata.ts src/content/tmua/canonicalize.ts tests/content/tmua/inventory-primitives.test.ts
git commit -m "feat: add deterministic TMUA PDF inventory primitives"
```

## Task 3: Classify Sources and Generate the Baseline Manifest

**Files:**
- Create: `src/content/tmua/classify.ts`
- Create: `src/content/tmua/inventory.ts`
- Create: `tests/content/tmua/classify.test.ts`
- Create: `tests/content/tmua/inventory.integration.test.ts`
- Generate: `content/tmua/corpus-manifest.json`
- Generate: `content/tmua/sources/original-materials.json`
- Generate: `content/tmua/sources/official-materials.json`
- Generate: `content/tmua/sources/duplicate-map.json`

**Interfaces:**
- Consumes: file discovery, metadata, digest grouping, and corpus types.
- Produces: `classifySource(path)`, `buildCorpusManifest(repoRoot, generatedAt)`, and deterministic JSON outputs.

- [ ] **Step 1: Write failing classification tests**

Create `tests/content/tmua/classify.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifySource } from "../../../src/content/tmua/classify.js";

describe("classifySource", () => {
  it.each([
    ["student textbook.pdf", "original_teaching", "teaching_textbook"],
    ["student workbook/student workbook.pdf", "original_compilation", "topic_workbook"],
    ["student workbook/tmua workbook answers.pdf", "original_compilation", "answer_map"],
    ["2016-2023paper/tmua-paper-2-2021.pdf", "official_source", "question_paper"],
    ["2016-2023 answer key/tmua-2021.pdf", "official_source", "answer_key"],
    ["2016-2023 answer/tmua-paper-2-2021.pdf", "official_source", "worked_solutions"],
    ["tmua-notes-on-logic-and-proof-enhanced-test-specification-.pdf", "official_source", "official_notes"],
    ["official-sources/TMUA-Content-Specification-2026.pdf", "official_source", "content_specification"],
    ["official-sources/TMUA-Notes-on-Mathematics-2026.pdf", "official_source", "official_notes"],
    ["official-sources/TMUA-2023-paper-2-worked-answers.pdf", "official_source", "worked_solutions"],
  ] as const)("classifies %s", (path, provenance, documentType) => {
    expect(classifySource(path)).toMatchObject({ provenance, documentType });
  });
});
```

- [ ] **Step 2: Run the classification test to verify it fails**

Run: `pnpm test -- tests/content/tmua/classify.test.ts`

Expected: FAIL because `classify.ts` does not exist.

- [ ] **Step 3: Implement source classification and edition parsing**

Create `src/content/tmua/classify.ts`:

```ts
import type { DocumentType, ProvenanceClass } from "./types.js";

export interface Classification {
  provenance: ProvenanceClass;
  documentType: DocumentType;
  edition?: string;
  paper?: 1 | 2;
}

export function classifySource(relativePath: string): Classification {
  const path = relativePath.toLowerCase();
  if (path.includes("student workbook/student workbook")) return { provenance: "original_compilation", documentType: "topic_workbook" };
  if (path.includes("student workbook/tmua workbook answers")) return { provenance: "original_compilation", documentType: "answer_map" };
  if (path.includes("student textbook")) return { provenance: "original_teaching", documentType: "teaching_textbook" };
  if (path.includes("content_specification") || path.includes("content-specification")) return { provenance: "official_source", documentType: "content_specification" };
  if (/notes[-_]on[-_]/.test(path) || path.includes("notes-on-logic")) return { provenance: "official_source", documentType: "official_notes" };

  const paper = path.match(/paper-([12])/)?.[1] as "1" | "2" | undefined;
  const year = path.match(/20(1[6-9]|2[0-3])/)?.[0];
  const edition = path.includes("specimen") ? "specimen" : path.includes("practice") ? "practice-2016" : year;
  const base = { provenance: "official_source" as const, edition, paper: paper ? Number(paper) as 1 | 2 : undefined };

  if (path.includes("2016-2023paper/")) return { ...base, documentType: "question_paper" };
  if (path.includes("2016-2023 answer key/") || /\/tmua-20(22|23)\.pdf$/.test(path) || path.includes("answer key 集锦")) {
    return { ...base, documentType: "answer_key" };
  }
  if (path.includes("2016-2023 answer/") && paper) return { ...base, documentType: "worked_solutions" };
  if (path.includes("official-sources/") && path.includes("worked-answers")) return { ...base, documentType: "worked_solutions" };
  throw new Error(`Unclassified TMUA PDF: ${relativePath}`);
}
```

- [ ] **Step 4: Implement manifest generation**

Create `src/content/tmua/inventory.ts` with these complete exports:

```ts
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { chooseCanonical, groupByDigest } from "./canonicalize.js";
import { classifySource } from "./classify.js";
import { atomicWrite, findPdfFiles } from "./fs-utils.js";
import { readPdfMetadata, sha256File } from "./pdf-metadata.js";
import type { CorpusManifest, SourceRecord } from "./types.js";

function stableSourceId(path: string, sha256: string): string {
  const stem = path.replace(/\.pdf$/i, "").replace(/\(1\)$/i, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `tmua-${stem}-${sha256.slice(0, 8)}`;
}

export async function buildCorpusManifest(repoRoot: string, generatedAt: string): Promise<CorpusManifest> {
  const rawRoot = join(repoRoot, "Tmua");
  const relativePaths = await findPdfFiles(rawRoot);
  const scanned = await Promise.all(relativePaths.map(async (relativePath) => {
    const absolute = join(rawRoot, relativePath);
    const [sha256, metadata, file] = await Promise.all([sha256File(absolute), readPdfMetadata(absolute), stat(absolute)]);
    return { relativePath, sha256, metadata, fileSize: file.size };
  }));
  const byPath = new Map(scanned.map((file) => [file.relativePath, file]));
  const sources: SourceRecord[] = groupByDigest(scanned).map((group) => {
    const canonical = chooseCanonical(group.paths);
    const file = byPath.get(canonical)!;
    const classification = classifySource(canonical);
    return {
      id: stableSourceId(canonical, group.sha256),
      canonicalPath: `Tmua/${canonical}`,
      duplicatePaths: group.paths.filter((path) => path !== canonical).map((path) => `Tmua/${path}`),
      sha256: group.sha256,
      fileSize: file.fileSize,
      metadata: file.metadata,
      ...classification,
      reviewStatus: "needs_review",
      audit: { generatedAt, generatedBy: "tmua-corpus-cli", schemaVersion: 1, changeReason: "inventory raw TMUA source" },
    };
  }).sort((a, b) => a.canonicalPath.localeCompare(b.canonicalPath, "en"));
  return {
    schemaVersion: 1,
    generatedAt,
    baseline: { pdfCount: 96, uniqueContentCount: 46, auditedAt: "2026-07-12" },
    sources,
  };
}

export async function writeManifestOutputs(repoRoot: string, manifest: CorpusManifest): Promise<void> {
  const output = join(repoRoot, "content/tmua");
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  await atomicWrite(join(output, "corpus-manifest.json"), json(manifest));
  await atomicWrite(join(output, "sources/original-materials.json"), json(manifest.sources.filter((s) => s.provenance.startsWith("original_"))));
  await atomicWrite(join(output, "sources/official-materials.json"), json(manifest.sources.filter((s) => s.provenance === "official_source")));
  await atomicWrite(join(output, "sources/duplicate-map.json"), json(manifest.sources.filter((s) => s.duplicatePaths.length).map((s) => ({ canonicalSourceId: s.id, canonicalPath: s.canonicalPath, duplicatePaths: s.duplicatePaths }))));
}
```

- [ ] **Step 5: Add the real-corpus integration test**

Create `tests/content/tmua/inventory.integration.test.ts`:

```ts
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCorpusManifest } from "../../../src/content/tmua/inventory.js";

describe("local TMUA baseline", () => {
  it("contains every audited PDF and unique digest before official sync", async () => {
    const manifest = await buildCorpusManifest(resolve("."), "2026-07-12T00:00:00.000Z");
    const represented = manifest.sources.reduce((count, source) => count + 1 + source.duplicatePaths.length, 0);
    expect(represented).toBeGreaterThanOrEqual(96);
    expect(manifest.sources.length).toBeGreaterThanOrEqual(46);
    expect(manifest.sources.every((source) => !source.canonicalPath.startsWith("/"))).toBe(true);
  });
});
```

- [ ] **Step 6: Run focused and full tests**

Run:

```bash
pnpm test -- tests/content/tmua/classify.test.ts tests/content/tmua/inventory.integration.test.ts
pnpm typecheck
```

Expected: PASS with at least 96 represented paths and 46 source records.

- [ ] **Step 7: Generate and inspect the baseline manifest**

Run: `pnpm tmua:inventory`

At this point `cli.ts` does not exist, so invoke a temporary direct expression only for inspection:

```bash
pnpm tsx -e "import {buildCorpusManifest,writeManifestOutputs} from './src/content/tmua/inventory.ts'; const m=await buildCorpusManifest(process.cwd(),'2026-07-12T00:00:00.000Z'); await writeManifestOutputs(process.cwd(),m); console.log(m.sources.length)"
```

Expected: prints at least `46` and creates the four JSON outputs.

- [ ] **Step 8: Commit source classification and baseline outputs**

```bash
git add src/content/tmua/classify.ts src/content/tmua/inventory.ts tests/content/tmua/classify.test.ts tests/content/tmua/inventory.integration.test.ts content/tmua/corpus-manifest.json content/tmua/sources
git commit -m "feat: catalog local TMUA source documents"
```

## Task 4: Add the Allowlisted Official-Source Synchronizer

**Files:**
- Create: `src/content/tmua/official-sources.ts`
- Modify: `src/content/tmua/inventory.ts`
- Create: `tests/content/tmua/official-sources.test.ts`
- Download locally without committing: `Tmua/official-sources/*.pdf`

**Interfaces:**
- Consumes: `atomicWrite`, `sha256File`.
- Produces: `OFFICIAL_SOURCES`, `downloadOfficialSource(source, repoRoot, fetchImpl)`, `syncOfficialSources(repoRoot)`.

- [ ] **Step 1: Write failing downloader tests**

Create `tests/content/tmua/official-sources.test.ts`:

```ts
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { downloadOfficialSource } from "../../../src/content/tmua/official-sources.js";

const source = {
  id: "test-official",
  url: "https://uat-wp.s3.eu-west-2.amazonaws.com/test.pdf",
  targetPath: "Tmua/official-sources/test.pdf",
  documentType: "official_notes" as const,
};

describe("official source downloader", () => {
  it("writes only PDF responses from the allowlisted host", async () => {
    const root = await mkdtemp(join(tmpdir(), "tmua-download-"));
    const fetchImpl = async () => new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]));
    const result = await downloadOfficialSource(source, root, fetchImpl as typeof fetch);
    expect(result.status).toBe("downloaded");
    expect(await readFile(join(root, source.targetPath), "utf8")).toBe("%PDF-1");
  });

  it("rejects a non-PDF response", async () => {
    const root = await mkdtemp(join(tmpdir(), "tmua-download-"));
    const fetchImpl = async () => new Response("<html>error</html>");
    await expect(downloadOfficialSource(source, root, fetchImpl as typeof fetch)).rejects.toThrow("not a PDF");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/content/tmua/official-sources.test.ts`

Expected: FAIL because the synchronizer does not exist.

- [ ] **Step 3: Implement the registry and safe downloader**

Create `src/content/tmua/official-sources.ts`:

```ts
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite } from "./fs-utils.js";

function reproducibleTimestamp(): string {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  return epoch ? new Date(Number(epoch) * 1000).toISOString() : new Date().toISOString();
}

export const OFFICIAL_SOURCES = [
  ["tmua-2022-p1-worked", "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2022-paper-1-worked-answers.pdf", "TMUA-2022-paper-1-worked-answers.pdf", "worked_solutions"],
  ["tmua-2022-p2-worked", "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2022-paper-2-worked-answers.pdf", "TMUA-2022-paper-2-worked-answers.pdf", "worked_solutions"],
  ["tmua-2023-p1-worked", "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2023-paper-1-worked-answers.pdf", "TMUA-2023-paper-1-worked-answers.pdf", "worked_solutions"],
  ["tmua-2023-p2-worked", "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2023-paper-2-worked-answers.pdf", "TMUA-2023-paper-2-worked-answers.pdf", "worked_solutions"],
  ["tmua-2026-spec", "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/03165619/TMUA_Content_Specification.pdf", "TMUA-Content-Specification-2026.pdf", "content_specification"],
  ["tmua-2026-maths-notes", "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/06/30103537/Notes_on_Mathematics_-for_TMUA_and_ESAT_M2.pdf", "TMUA-Notes-on-Mathematics-2026.pdf", "official_notes"],
  ["tmua-2025-logic-notes", "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/06/25160507/Notes_on_Logic_and_Proof_June2025.pdf", "TMUA-Notes-on-Logic-and-Proof-2025.pdf", "official_notes"],
] .map(([id, url, filename, documentType]) => ({ id, url, targetPath: `Tmua/official-sources/${filename}`, documentType })) as Array<{ id: string; url: string; targetPath: string; documentType: "worked_solutions" | "content_specification" | "official_notes" }>;

export const LINK_ONLY_RESOURCES = [
  {
    id: "tmua-current-pearson-practice",
    url: "https://www.pearsonvue.com/us/en/uatuk.html",
    documentType: "link_only" as const,
    note: "Current specimen and practice tests open in the Pearson test player and are not scraped.",
  },
];

export async function downloadOfficialSource(
  source: (typeof OFFICIAL_SOURCES)[number],
  repoRoot: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; path: string; status: "downloaded" | "unchanged"; retrievedAt: string }> {
  const url = new URL(source.url);
  if (url.hostname !== "uat-wp.s3.eu-west-2.amazonaws.com") throw new Error(`Official host not allowlisted: ${url.hostname}`);
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${source.url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`Response is not a PDF: ${source.url}`);
  const target = join(repoRoot, source.targetPath);
  try {
    const existing = await readFile(target);
    if (Buffer.compare(existing, Buffer.from(bytes)) === 0) return { id: source.id, path: source.targetPath, status: "unchanged", retrievedAt: reproducibleTimestamp() };
    throw new Error(`Refusing to overwrite changed official source: ${source.targetPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await atomicWrite(target, bytes);
  await access(target);
  return { id: source.id, path: source.targetPath, status: "downloaded", retrievedAt: reproducibleTimestamp() };
}

export async function syncOfficialSources(repoRoot: string): Promise<Array<{ id: string; path: string; status: "downloaded" | "unchanged"; retrievedAt: string }>> {
  const results = [];
  for (const source of OFFICIAL_SOURCES) results.push(await downloadOfficialSource(source, repoRoot));
  return results;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- tests/content/tmua/official-sources.test.ts`

Expected: PASS without network access.

- [ ] **Step 5: Attach official URLs to generated source records**

Add this import to `src/content/tmua/inventory.ts`:

```ts
import { OFFICIAL_SOURCES } from "./official-sources.js";
```

Immediately before returning each `SourceRecord` inside the `groupByDigest(...).map(...)`, add:

```ts
const repositoryPath = `Tmua/${canonical}`;
const official = OFFICIAL_SOURCES.find((source) => source.targetPath === repositoryPath);
```

Then replace `canonicalPath: \`Tmua/${canonical}\`,` with these fields:

```ts
canonicalPath: repositoryPath,
officialUrl: official?.url,
```

- [ ] **Step 6: Run typechecking and verify the registry contains seven unique targets**

Run:

```bash
pnpm typecheck
pnpm tsx -e "import {OFFICIAL_SOURCES} from './src/content/tmua/official-sources.ts'; if(OFFICIAL_SOURCES.length!==7 || new Set(OFFICIAL_SOURCES.map(s=>s.targetPath)).size!==7) process.exit(1); console.log('7 unique official targets')"
```

Expected: typecheck PASS and the command prints `7 unique official targets`.

- [ ] **Step 7: Commit downloader code, excluding PDFs**

```bash
git add src/content/tmua/official-sources.ts src/content/tmua/inventory.ts tests/content/tmua/official-sources.test.ts
git commit -m "feat: add allowlisted TMUA official source sync"
```

## Task 5: Reconcile All Eighteen Historic Papers

**Files:**
- Create: `src/content/tmua/past-papers.ts`
- Create: `tests/content/tmua/past-papers.test.ts`

**Interfaces:**
- Consumes: `CorpusManifest`, `SourceRecord`, `PaperRecord`.
- Produces: `buildPastPaperIndex(manifest)` and a stable 18-record index.

- [ ] **Step 1: Write the failing paper-index test**

Create `tests/content/tmua/past-papers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { expectedPaperSlots } from "../../../src/content/tmua/past-papers.js";

describe("historic TMUA paper slots", () => {
  it("defines eighteen papers and 360 question slots", () => {
    const slots = expectedPaperSlots();
    expect(slots).toHaveLength(18);
    expect(slots.reduce((sum, paper) => sum + paper.expectedQuestionCount, 0)).toBe(360);
    expect(new Set(slots.map((paper) => paper.id)).size).toBe(18);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/content/tmua/past-papers.test.ts`

Expected: FAIL because `past-papers.ts` does not exist.

- [ ] **Step 3: Implement expected slots and source linking**

Create `src/content/tmua/past-papers.ts`:

```ts
import type { CorpusManifest, PaperRecord, SourceRecord } from "./types.js";

const editions = ["specimen", "practice-2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"] as const;

export function expectedPaperSlots(): Array<Omit<PaperRecord, "questionSourceId" | "answerSourceId" | "workedSolutionSourceId" | "completeness" | "audit">> {
  return editions.flatMap((edition) => ([1, 2] as const).map((paper) => ({
    id: `tmua-${edition}-p${paper}`,
    edition,
    paper,
    durationMinutes: 75,
    expectedQuestionCount: 20,
  })));
}

function findSource(sources: SourceRecord[], documentType: SourceRecord["documentType"], edition: string, paper?: 1 | 2): SourceRecord | undefined {
  return sources.find((source) => source.documentType === documentType && source.edition === edition && (paper === undefined || source.paper === paper));
}

export function buildPastPaperIndex(manifest: CorpusManifest): PaperRecord[] {
  return expectedPaperSlots().map((slot) => {
    const question = findSource(manifest.sources, "question_paper", slot.edition, slot.paper);
    const answer = findSource(manifest.sources, "answer_key", slot.edition);
    const solution = findSource(manifest.sources, "worked_solutions", slot.edition, slot.paper);
    return {
      ...slot,
      questionSourceId: question?.id ?? "missing",
      answerSourceId: answer?.id ?? "missing",
      workedSolutionSourceId: solution?.id ?? "missing",
      completeness: question && answer && solution ? "complete" : "incomplete",
      audit: { generatedAt: manifest.generatedAt, generatedBy: "tmua-corpus-cli", schemaVersion: 1, changeReason: "reconcile historic paper sources" },
    };
  });
}
```

- [ ] **Step 4: Extend the test with a complete synthetic manifest**

Add to `tests/content/tmua/past-papers.test.ts`:

```ts
import { buildPastPaperIndex } from "../../../src/content/tmua/past-papers.js";
import type { CorpusManifest, SourceRecord } from "../../../src/content/tmua/types.js";

it("links question, answer, and worked-solution sources", () => {
  const base = { canonicalPath: "Tmua/x.pdf", duplicatePaths: [], sha256: "a".repeat(64), fileSize: 1, metadata: { pages: 1 }, provenance: "official_source" as const, reviewStatus: "needs_review" as const, audit: { generatedAt: "x", generatedBy: "tmua-corpus-cli" as const, schemaVersion: 1 as const, changeReason: "test" } };
  const sources: SourceRecord[] = [
    { ...base, id: "q", documentType: "question_paper", edition: "2023", paper: 1 },
    { ...base, id: "a", documentType: "answer_key", edition: "2023" },
    { ...base, id: "s", documentType: "worked_solutions", edition: "2023", paper: 1 },
  ];
  const manifest: CorpusManifest = { schemaVersion: 1, generatedAt: "x", baseline: { pdfCount: 96, uniqueContentCount: 46, auditedAt: "2026-07-12" }, sources };
  const paper = buildPastPaperIndex(manifest).find((item) => item.id === "tmua-2023-p1")!;
  expect(paper).toMatchObject({ questionSourceId: "q", answerSourceId: "a", workedSolutionSourceId: "s", completeness: "complete" });
});
```

- [ ] **Step 5: Run tests and verify the slot generator directly**

Run:

```bash
pnpm test -- tests/content/tmua/past-papers.test.ts
pnpm tsx -e "import {expectedPaperSlots} from './src/content/tmua/past-papers.ts'; const p=expectedPaperSlots(); if(p.length!==18 || p.reduce((n,x)=>n+x.expectedQuestionCount,0)!==360) process.exit(1); console.log('18 papers / 360 slots')"
```

Expected: tests PASS and the command prints `18 papers / 360 slots`.

- [ ] **Step 6: Commit the paper index**

```bash
git add src/content/tmua/past-papers.ts tests/content/tmua/past-papers.test.ts
git commit -m "feat: reconcile complete TMUA historic paper archive"
```

## Task 6: Establish and Validate the First TMUA Taxonomy

**Files:**
- Create: `content/tmua/taxonomy/knowledge-tree.yaml`
- Create: `content/tmua/taxonomy/skill-tags.yaml`
- Create: `content/tmua/taxonomy/error-types.yaml`
- Create: `src/content/tmua/taxonomy.ts`
- Create: `tests/content/tmua/taxonomy.test.ts`

**Interfaces:**
- Consumes: `TaxonomyNode`, taxonomy JSON Schema.
- Produces: `loadTaxonomy(path)` and `validateTaxonomy(nodes)`.

- [ ] **Step 1: Write failing taxonomy tests**

Create `tests/content/tmua/taxonomy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadStringList, loadTaxonomy, validateStringList, validateTaxonomy } from "../../../src/content/tmua/taxonomy.js";

describe("TMUA taxonomy", () => {
  it("loads the knowledge tree with no P0 issues", async () => {
    const nodes = await loadTaxonomy("content/tmua/taxonomy/knowledge-tree.yaml");
    expect(nodes.length).toBeGreaterThanOrEqual(25);
    expect(validateTaxonomy(nodes).filter((issue) => issue.severity === "P0")).toEqual([]);
  });

  it("rejects cycles", () => {
    const nodes = [
      { id: "a", name: "A", parentId: "b", level: "CORE" as const, specificationRefs: [], prerequisites: [], aliases: [] },
      { id: "b", name: "B", parentId: "a", level: "CORE" as const, specificationRefs: [], prerequisites: [], aliases: [] },
    ];
    expect(validateTaxonomy(nodes).some((issue) => issue.code === "taxonomy-cycle")).toBe(true);
  });

  it("loads unique skill and error slugs", async () => {
    const skills = await loadStringList("content/tmua/taxonomy/skill-tags.yaml");
    const errors = await loadStringList("content/tmua/taxonomy/error-types.yaml");
    expect(validateStringList(skills, "skill")).toEqual([]);
    expect(validateStringList(errors, "error")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/content/tmua/taxonomy.test.ts`

Expected: FAIL because the YAML and validator do not exist.

- [ ] **Step 3: Create the first knowledge tree**

Create `content/tmua/taxonomy/knowledge-tree.yaml` with these nodes, preserving the exact field names:

```yaml
- { id: algebra-functions, name: Algebra and Functions, parentId: null, level: CORE, specificationRefs: [MM1], prerequisites: [], aliases: [Algebra] }
- { id: algebra.indices-surds, name: Indices and Surds, parentId: algebra-functions, level: CORE, specificationRefs: [MM1.1, MM1.2], prerequisites: [], aliases: [Index Laws] }
- { id: algebra.quadratics, name: Quadratic Functions, parentId: algebra-functions, level: CORE, specificationRefs: [MM1.3], prerequisites: [algebra.indices-surds], aliases: [Quadratics] }
- { id: algebra.simultaneous, name: Simultaneous Equations, parentId: algebra-functions, level: CORE, specificationRefs: [MM1.4], prerequisites: [algebra.quadratics], aliases: [] }
- { id: algebra.inequalities, name: Linear and Quadratic Inequalities, parentId: algebra-functions, level: CORE, specificationRefs: [MM1.5], prerequisites: [algebra.quadratics], aliases: [] }
- { id: algebra.polynomials, name: Polynomials, parentId: algebra-functions, level: CORE, specificationRefs: [MM1.6], prerequisites: [algebra.quadratics], aliases: [] }
- { id: algebra.functions, name: Functions and Mappings, parentId: algebra-functions, level: CORE, specificationRefs: [MM1.7], prerequisites: [algebra.polynomials], aliases: [Mappings] }
- { id: sequences-series, name: Sequences and Series, parentId: null, level: CORE, specificationRefs: [MM2], prerequisites: [algebra-functions], aliases: [] }
- { id: sequences.arithmetic, name: Arithmetic Sequences and Series, parentId: sequences-series, level: CORE, specificationRefs: [MM2.1, MM2.2], prerequisites: [], aliases: [] }
- { id: sequences.geometric, name: Geometric Sequences and Series, parentId: sequences-series, level: CORE, specificationRefs: [MM2.3], prerequisites: [], aliases: [] }
- { id: sequences.binomial, name: Positive Integer Binomial Expansion, parentId: sequences-series, level: CORE, specificationRefs: [MM2.4], prerequisites: [algebra.polynomials], aliases: [Binomial Expansion] }
- { id: sequences.general-binomial, name: General Binomial Expansion, parentId: sequences-series, level: EXTENSION, specificationRefs: [], prerequisites: [sequences.binomial], aliases: [] }
- { id: coordinate-geometry, name: Coordinate Geometry, parentId: null, level: CORE, specificationRefs: [MM3], prerequisites: [algebra-functions], aliases: [] }
- { id: geometry.lines, name: Straight Lines, parentId: coordinate-geometry, level: CORE, specificationRefs: [MM3.1], prerequisites: [], aliases: [] }
- { id: geometry.circles, name: Circles and Circle Theorems, parentId: coordinate-geometry, level: CORE, specificationRefs: [MM3.2, MM3.3], prerequisites: [geometry.lines], aliases: [] }
- { id: trigonometry, name: Trigonometry, parentId: null, level: CORE, specificationRefs: [MM4], prerequisites: [coordinate-geometry], aliases: [Trig] }
- { id: trig.rules, name: Sine and Cosine Rules, parentId: trigonometry, level: CORE, specificationRefs: [MM4.1], prerequisites: [], aliases: [] }
- { id: trig.radians, name: Radian Measure, parentId: trigonometry, level: CORE, specificationRefs: [MM4.2], prerequisites: [], aliases: [] }
- { id: trig.identities-equations, name: Identities and Equations, parentId: trigonometry, level: CORE, specificationRefs: [MM4.3, MM4.4, MM4.5, MM4.6], prerequisites: [trig.rules], aliases: [] }
- { id: exponentials-logarithms, name: Exponentials and Logarithms, parentId: null, level: CORE, specificationRefs: [MM5], prerequisites: [algebra-functions], aliases: [Logs] }
- { id: differentiation, name: Differentiation, parentId: null, level: CORE, specificationRefs: [MM6], prerequisites: [algebra-functions], aliases: [] }
- { id: differentiation.product-chain-quotient, name: Product Chain and Quotient Rules, parentId: differentiation, level: EXTENSION, specificationRefs: [], prerequisites: [differentiation], aliases: [] }
- { id: integration, name: Integration, parentId: null, level: CORE, specificationRefs: [MM7], prerequisites: [differentiation], aliases: [] }
- { id: graphs-functions, name: Graphs of Functions, parentId: null, level: CORE, specificationRefs: [MM8], prerequisites: [algebra.functions, differentiation], aliases: [] }
- { id: mathematical-logic, name: Mathematical Logic, parentId: null, level: CORE, specificationRefs: [Arg1, Arg2, Arg3, Arg4], prerequisites: [], aliases: [Logic of Arguments] }
- { id: logic.implication, name: Implication Converse and Contrapositive, parentId: mathematical-logic, level: CORE, specificationRefs: [Arg1], prerequisites: [], aliases: [] }
- { id: logic.necessary-sufficient, name: Necessary and Sufficient Conditions, parentId: mathematical-logic, level: CORE, specificationRefs: [Arg2], prerequisites: [logic.implication], aliases: [] }
- { id: mathematical-proof, name: Mathematical Proof, parentId: null, level: CORE, specificationRefs: [Prf1, Prf2, Prf3, Prf4, Prf5], prerequisites: [mathematical-logic], aliases: [] }
- { id: proof.errors, name: Errors in Proof, parentId: mathematical-proof, level: CORE, specificationRefs: [Err1, Err2], prerequisites: [mathematical-proof], aliases: [] }
- { id: gcse-support, name: Higher GCSE Supporting Knowledge, parentId: null, level: SUPPORT, specificationRefs: [M1, M2, M3, M4, M5], prerequisites: [], aliases: [] }
```

Create `content/tmua/taxonomy/skill-tags.yaml`:

```yaml
- algebraic-transformation
- representation-switching
- diagram-interpretation
- condition-checking
- counterexample-construction
- necessary-sufficient-reasoning
- proof-sequencing
- approximation-estimation
- option-elimination
- multi-step-planning
- time-sensitive-calculation
- error-detection
```

Create `content/tmua/taxonomy/error-types.yaml`:

```yaml
- knowledge-gap
- invalid-inference
- condition-omitted
- sign-or-inequality-reversal
- algebraic-manipulation
- diagram-misread
- calculation-slip
- premature-approximation
- distractor-attraction
- time-pressure-guess
- answer-transfer-error
- unresolved-insufficient-evidence
```

- [ ] **Step 4: Implement taxonomy loading and cycle validation**

Create `src/content/tmua/taxonomy.ts`:

```ts
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { TaxonomyNode, ValidationIssue } from "./types.js";

export async function loadTaxonomy(path: string): Promise<TaxonomyNode[]> {
  const value = parse(await readFile(path, "utf8"));
  if (!Array.isArray(value)) throw new Error(`Taxonomy must be an array: ${path}`);
  return value as TaxonomyNode[];
}

export async function loadStringList(path: string): Promise<string[]> {
  const value = parse(await readFile(path, "utf8"));
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw new Error(`Expected a string list: ${path}`);
  return value;
}

export function validateStringList(values: string[], kind: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!/^[a-z0-9-]+$/.test(value)) issues.push({ severity: "P0", code: `${kind}-slug`, message: `Invalid ${kind} slug: ${value}` });
    if (seen.has(value)) issues.push({ severity: "P0", code: `duplicate-${kind}`, message: `Duplicate ${kind}: ${value}` });
    seen.add(value);
  }
  return issues;
}

export function validateTaxonomy(nodes: TaxonomyNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map<string, TaxonomyNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) issues.push({ severity: "P0", code: "duplicate-taxonomy-id", message: `Duplicate taxonomy ID: ${node.id}` });
    byId.set(node.id, node);
  }
  for (const node of nodes) {
    if (node.parentId && !byId.has(node.parentId)) issues.push({ severity: "P0", code: "missing-parent", message: `${node.id} references missing parent ${node.parentId}` });
    for (const prerequisite of node.prerequisites) if (!byId.has(prerequisite)) issues.push({ severity: "P0", code: "missing-prerequisite", message: `${node.id} references missing prerequisite ${prerequisite}` });
  }
  for (const start of nodes) {
    const seen = new Set<string>();
    let current: TaxonomyNode | undefined = start;
    while (current?.parentId) {
      if (seen.has(current.id)) { issues.push({ severity: "P0", code: "taxonomy-cycle", message: `Taxonomy cycle includes ${current.id}` }); break; }
      seen.add(current.id);
      current = byId.get(current.parentId);
    }
  }
  return issues;
}
```

- [ ] **Step 5: Run tests and taxonomy verification**

Run:

```bash
pnpm test -- tests/content/tmua/taxonomy.test.ts
pnpm tsx -e "import {loadStringList,loadTaxonomy,validateStringList,validateTaxonomy} from './src/content/tmua/taxonomy.ts'; const issues=[...validateTaxonomy(await loadTaxonomy('content/tmua/taxonomy/knowledge-tree.yaml')),...validateStringList(await loadStringList('content/tmua/taxonomy/skill-tags.yaml'),'skill'),...validateStringList(await loadStringList('content/tmua/taxonomy/error-types.yaml'),'error')]; console.log(JSON.stringify(issues)); if(issues.some(i=>i.severity==='P0')) process.exit(1)"
```

Expected: tests PASS and verification reports zero P0 issues.

- [ ] **Step 6: Commit the taxonomy**

```bash
git add content/tmua/taxonomy src/content/tmua/taxonomy.ts tests/content/tmua/taxonomy.test.ts
git commit -m "feat: establish TMUA knowledge and diagnostic taxonomy"
```

## Task 7: Add the Agent-Facing CLI, Validation Gates, and Audit Report

**Files:**
- Create: `src/content/tmua/report.ts`
- Create: `src/content/tmua/verify.ts`
- Create: `src/content/tmua/cli.ts`
- Create: `tests/content/tmua/verify.test.ts`
- Create: `content/tmua/README.md`
- Generate: `content/tmua/sources/official-downloads.json`
- Generate: `content/tmua/sources/link-only.json`
- Generate: `docs/content/TMUA_CORPUS_REPORT.md`

**Interfaces:**
- Consumes: every Phase 1 module.
- Produces: stable CLI commands with `0` for success and `1` for P0/P1 blocking failure; `renderCorpusReport(manifest, papers, issues)`.

- [ ] **Step 1: Write failing validation tests**

Create `tests/content/tmua/verify.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verifyPaperIndex, verifySourceManifest } from "../../../src/content/tmua/verify.js";

describe("corpus release gates", () => {
  it("blocks duplicate source IDs", () => {
    const source = { id: "same", canonicalPath: "Tmua/a.pdf", duplicatePaths: [], sha256: "a".repeat(64), fileSize: 1, metadata: { pages: 1 }, provenance: "official_source" as const, documentType: "official_notes" as const, reviewStatus: "needs_review" as const, audit: { generatedAt: "x", generatedBy: "tmua-corpus-cli" as const, schemaVersion: 1 as const, changeReason: "test" } };
    expect(verifySourceManifest({ schemaVersion: 1, generatedAt: "x", baseline: { pdfCount: 96, uniqueContentCount: 46, auditedAt: "2026-07-12" }, sources: [source, { ...source, canonicalPath: "Tmua/b.pdf" }] }).some((issue) => issue.code === "duplicate-source-id")).toBe(true);
  });

  it("blocks an incomplete paper", () => {
    const paper = { id: "tmua-2023-p1", edition: "2023", paper: 1 as const, durationMinutes: 75 as const, expectedQuestionCount: 20 as const, questionSourceId: "q", answerSourceId: "a", workedSolutionSourceId: "missing", completeness: "incomplete" as const, audit: { generatedAt: "x", generatedBy: "tmua-corpus-cli" as const, schemaVersion: 1 as const, changeReason: "test" } };
    expect(verifyPaperIndex([paper]).some((issue) => issue.severity === "P0")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/content/tmua/verify.test.ts`

Expected: FAIL because `verify.ts` does not exist.

- [ ] **Step 3: Implement release-gate validators**

Create `src/content/tmua/verify.ts`:

```ts
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { sha256File } from "./pdf-metadata.js";
import type { CorpusManifest, PaperRecord, TaxonomyNode, ValidationIssue } from "./types.js";

export function verifySourceManifest(manifest: CorpusManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const source of manifest.sources) {
    if (ids.has(source.id)) issues.push({ severity: "P0", code: "duplicate-source-id", message: `Duplicate source ID ${source.id}` });
    if (paths.has(source.canonicalPath)) issues.push({ severity: "P0", code: "duplicate-canonical-path", message: `Duplicate canonical path ${source.canonicalPath}` });
    if (source.canonicalPath.startsWith("/")) issues.push({ severity: "P0", code: "absolute-path", message: `Absolute path persisted: ${source.canonicalPath}` });
    ids.add(source.id);
    paths.add(source.canonicalPath);
  }
  return issues;
}

export async function verifySourceFiles(repoRoot: string, manifest: CorpusManifest): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  for (const source of manifest.sources) {
    try {
      const absolute = join(repoRoot, source.canonicalPath);
      await access(absolute);
      const digest = await sha256File(absolute);
      if (digest !== source.sha256) issues.push({ severity: "P0", code: "digest-mismatch", message: `Digest mismatch for ${source.canonicalPath}`, path: source.canonicalPath });
    }
    catch { issues.push({ severity: "P0", code: "missing-canonical-file", message: `Missing ${source.canonicalPath}`, path: source.canonicalPath }); }
  }
  return issues;
}

export async function verifySchemas(repoRoot: string, manifest: CorpusManifest, papers: PaperRecord[], taxonomy: TaxonomyNode[]): Promise<ValidationIssue[]> {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const load = async (name: string) => JSON.parse(await readFile(join(repoRoot, `content/tmua/schemas/${name}.schema.json`), "utf8"));
  const sourceValidator = ajv.compile(await load("source"));
  const paperValidator = ajv.compile(await load("paper"));
  const taxonomyValidator = ajv.compile(await load("taxonomy"));
  const issues: ValidationIssue[] = [];
  for (const source of manifest.sources) if (!sourceValidator(source)) issues.push({ severity: "P0", code: "source-schema", message: `${source.id}: ${ajv.errorsText(sourceValidator.errors)}` });
  for (const paper of papers) if (!paperValidator(paper)) issues.push({ severity: "P0", code: "paper-schema", message: `${paper.id}: ${ajv.errorsText(paperValidator.errors)}` });
  if (!taxonomyValidator(taxonomy)) issues.push({ severity: "P0", code: "taxonomy-schema", message: ajv.errorsText(taxonomyValidator.errors) });
  return issues;
}

export function verifyPaperIndex(papers: PaperRecord[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (papers.length !== 18) issues.push({ severity: "P0", code: "paper-count", message: `Expected 18 papers, found ${papers.length}` });
  if (papers.reduce((sum, paper) => sum + paper.expectedQuestionCount, 0) !== 360) issues.push({ severity: "P0", code: "question-slot-count", message: "Expected 360 question slots" });
  for (const paper of papers) if (paper.completeness !== "complete") issues.push({ severity: "P0", code: "incomplete-paper", message: `Incomplete paper ${paper.id}` });
  return issues;
}
```

- [ ] **Step 4: Implement report rendering**

Create `src/content/tmua/report.ts`:

```ts
import type { CorpusManifest, PaperRecord, ValidationIssue } from "./types.js";

export function renderCorpusReport(manifest: CorpusManifest, papers: PaperRecord[], issues: ValidationIssue[]): string {
  const represented = manifest.sources.reduce((sum, source) => sum + 1 + source.duplicatePaths.length, 0);
  const duplicates = represented - manifest.sources.length;
  const completePapers = papers.filter((paper) => paper.completeness === "complete").length;
  const lines = [
    "# TMUA Corpus Report",
    "",
    `Generated: ${manifest.generatedAt}`,
    "",
    "## Summary",
    "",
    `- PDF paths represented: ${represented}`,
    `- Unique contents: ${manifest.sources.length}`,
    `- Duplicate paths: ${duplicates}`,
    `- Historic papers complete: ${completePapers}/18`,
    `- Expected question slots: ${papers.reduce((sum, paper) => sum + paper.expectedQuestionCount, 0)}`,
    `- P0 issues: ${issues.filter((issue) => issue.severity === "P0").length}`,
    "",
    "## Blocking Issues",
    "",
    ...(issues.filter((issue) => issue.severity === "P0").map((issue) => `- ${issue.code}: ${issue.message}`)),
    ...(issues.some((issue) => issue.severity === "P0") ? [] : ["- None"]),
    "",
    "## Historic Paper Matrix",
    "",
    "| Paper | Questions | Answer | Worked solution | Status |",
    "|---|---:|---|---|---|",
    ...papers.map((paper) => `| ${paper.id} | ${paper.expectedQuestionCount} | ${paper.answerSourceId} | ${paper.workedSolutionSourceId} | ${paper.completeness} |`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 5: Implement the CLI and atomic generated outputs**

Create `src/content/tmua/cli.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { atomicWrite } from "./fs-utils.js";
import { buildCorpusManifest, writeManifestOutputs } from "./inventory.js";
import { LINK_ONLY_RESOURCES, OFFICIAL_SOURCES, syncOfficialSources } from "./official-sources.js";
import { buildPastPaperIndex } from "./past-papers.js";
import { renderCorpusReport } from "./report.js";
import { loadStringList, loadTaxonomy, validateStringList, validateTaxonomy } from "./taxonomy.js";
import type { CorpusManifest } from "./types.js";
import { verifyPaperIndex, verifySchemas, verifySourceFiles, verifySourceManifest } from "./verify.js";
import { readPdfMetadata, sha256File } from "./pdf-metadata.js";

const repoRoot = resolve(".");
const command = process.argv[2];
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const generatedAt = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString();

async function build(): Promise<{ manifest: CorpusManifest; issues: ReturnType<typeof verifySourceManifest> }> {
  const manifest = await buildCorpusManifest(repoRoot, generatedAt);
  await writeManifestOutputs(repoRoot, manifest);
  const papers = buildPastPaperIndex(manifest);
  await atomicWrite(join(repoRoot, "content/tmua/past-papers/index.json"), json(papers));
  const taxonomy = await loadTaxonomy(join(repoRoot, "content/tmua/taxonomy/knowledge-tree.yaml"));
  const skills = await loadStringList(join(repoRoot, "content/tmua/taxonomy/skill-tags.yaml"));
  const errorTypes = await loadStringList(join(repoRoot, "content/tmua/taxonomy/error-types.yaml"));
  const issues = [...verifySourceManifest(manifest), ...(await verifySourceFiles(repoRoot, manifest)), ...verifyPaperIndex(papers), ...validateTaxonomy(taxonomy), ...validateStringList(skills, "skill"), ...validateStringList(errorTypes, "error"), ...(await verifySchemas(repoRoot, manifest, papers, taxonomy))];
  await atomicWrite(join(repoRoot, "docs/content/TMUA_CORPUS_REPORT.md"), renderCorpusReport(manifest, papers, issues));
  return { manifest, issues };
}

if (command === "sync-official") {
  const results = await syncOfficialSources(repoRoot);
  const enriched = await Promise.all(results.map(async (result) => ({
    ...result,
    url: OFFICIAL_SOURCES.find((source) => source.id === result.id)!.url,
    sha256: await sha256File(join(repoRoot, result.path)),
    metadata: await readPdfMetadata(join(repoRoot, result.path)),
  })));
  await atomicWrite(join(repoRoot, "content/tmua/sources/official-downloads.json"), json(enriched));
  await atomicWrite(join(repoRoot, "content/tmua/sources/link-only.json"), json(LINK_ONLY_RESOURCES));
  console.log(`Official sources synchronized: ${enriched.length}`);
} else if (command === "inventory" || command === "build") {
  const { manifest, issues } = await build();
  console.log(`Sources: ${manifest.sources.length}; blocking issues: ${issues.filter((issue) => issue.severity === "P0").length}`);
} else if (command === "verify-taxonomy") {
  const issues = [
    ...validateTaxonomy(await loadTaxonomy(join(repoRoot, "content/tmua/taxonomy/knowledge-tree.yaml"))),
    ...validateStringList(await loadStringList(join(repoRoot, "content/tmua/taxonomy/skill-tags.yaml")), "skill"),
    ...validateStringList(await loadStringList(join(repoRoot, "content/tmua/taxonomy/error-types.yaml")), "error"),
  ];
  console.log(json(issues));
  if (issues.some((issue) => issue.severity === "P0")) process.exitCode = 1;
} else if (command === "verify-files" || command === "verify-corpus") {
  const manifest = JSON.parse(await readFile(join(repoRoot, "content/tmua/corpus-manifest.json"), "utf8")) as CorpusManifest;
  const papers = JSON.parse(await readFile(join(repoRoot, "content/tmua/past-papers/index.json"), "utf8"));
  const taxonomy = await loadTaxonomy(join(repoRoot, "content/tmua/taxonomy/knowledge-tree.yaml"));
  const skills = await loadStringList(join(repoRoot, "content/tmua/taxonomy/skill-tags.yaml"));
  const errorTypes = await loadStringList(join(repoRoot, "content/tmua/taxonomy/error-types.yaml"));
  const issues = [...verifySourceManifest(manifest), ...(await verifySourceFiles(repoRoot, manifest)), ...verifyPaperIndex(papers), ...validateTaxonomy(taxonomy), ...validateStringList(skills, "skill"), ...validateStringList(errorTypes, "error"), ...(await verifySchemas(repoRoot, manifest, papers, taxonomy))];
  console.log(json(issues));
  if (issues.some((issue) => issue.severity === "P0" || issue.severity === "P1")) process.exitCode = 1;
} else {
  console.error("Usage: cli.ts inventory|sync-official|build|verify-files|verify-taxonomy|verify-corpus");
  process.exitCode = 1;
}
```

- [ ] **Step 6: Create the corpus operating guide**

Create `content/tmua/README.md` documenting these exact commands and boundaries:

```markdown
# TMUA Corpus

`Tmua/` is the immutable raw document layer. Files under `content/tmua/` are generated indexes, schemas, and taxonomies. Do not edit generated JSON by hand.

## Commands

- `pnpm tmua:sync-official` downloads only allowlisted official PDFs.
- `pnpm tmua:inventory` rebuilds source and duplicate manifests.
- `pnpm tmua:build` rebuilds manifests, paper index, and report.
- `pnpm verify:tmua-files` checks manifest paths and source integrity.
- `pnpm verify:tmua-taxonomy` checks taxonomy IDs, links, and cycles.
- `pnpm verify:tmua-corpus` runs all Phase 1 release gates.

Automatic extraction is not publishable content. A question requires independent formula, option, answer, diagram, and source verification in Phase 2.
```

- [ ] **Step 7: Run all tests and commands**

Run:

```bash
export SOURCE_DATE_EPOCH=1783785600
pnpm test
pnpm typecheck
pnpm tmua:sync-official
pnpm tmua:build
pnpm verify:tmua-corpus
```

Expected: all tests and typecheck PASS; seven official sources are synchronized; the final verifier returns exit code 0.

- [ ] **Step 8: Commit the CLI, validation, and report**

```bash
git add src/content/tmua/report.ts src/content/tmua/verify.ts src/content/tmua/cli.ts tests/content/tmua/verify.test.ts content/tmua/README.md docs/content/TMUA_CORPUS_REPORT.md content/tmua/corpus-manifest.json content/tmua/sources content/tmua/past-papers/index.json
git commit -m "feat: add agent-runnable TMUA corpus validation"
```

## Task 8: Perform the Phase 1 Release Audit

**Files:**
- Modify only if evidence requires correction: generated JSON and `docs/content/TMUA_CORPUS_REPORT.md`
- Create: `docs/content/TMUA_PHASE1_VERIFICATION.md`
- Do not add: `Tmua/**/*.pdf`

**Interfaces:**
- Consumes: all Phase 1 commands.
- Produces: a verified Phase 1 corpus report tied to the final Git commit.

- [ ] **Step 1: Verify dependency reproducibility**

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
```

Expected: clean install succeeds; typecheck and all tests PASS.

- [ ] **Step 2: Rebuild from the raw source layer**

Run:

```bash
export SOURCE_DATE_EPOCH=1783785600
pnpm tmua:sync-official
pnpm tmua:build
```

Expected report values:

- at least 103 PDF paths represented: 96 baseline plus seven official additions;
- at least 53 unique contents: 46 baseline plus seven official additions;
- 18 complete historic papers;
- 360 expected question slots;
- zero P0 issues.

- [ ] **Step 3: Run every release gate independently**

Run:

```bash
pnpm verify:tmua-files
pnpm verify:tmua-taxonomy
pnpm verify:tmua-corpus
```

Expected: each command exits `0`.

- [ ] **Step 4: Visually inspect the seven downloaded PDFs**

Render each first page using system Poppler:

```bash
mkdir -p /private/tmp/tmua-phase1-render
for file in Tmua/official-sources/*.pdf; do pdftoppm -f 1 -l 1 -singlefile -png "$file" "/private/tmp/tmua-phase1-render/$(basename "$file" .pdf)"; done
```

Inspect every PNG and confirm:

- the title matches the registry entry;
- the PDF is not an HTML error page;
- formulas and headings render legibly;
- the 2022/2023 worked solutions identify the correct year and paper;
- the content specification identifies assessment in October 2026 and January 2027.

- [ ] **Step 5: Confirm Git scope and generated-file stability**

Run:

```bash
export SOURCE_DATE_EPOCH=1783785600
git status --short
pnpm tmua:build
git diff --exit-code -- content/tmua docs/content/TMUA_CORPUS_REPORT.md
```

Expected: raw PDFs remain untracked and a second build produces no diff.

- [ ] **Step 6: Record the release evidence**

Create `docs/content/TMUA_PHASE1_VERIFICATION.md` containing:

```markdown
# TMUA Phase 1 Verification Evidence

- TypeScript typecheck: PASS
- Automated tests: PASS
- File validation: PASS
- Taxonomy validation: PASS
- Corpus validation: PASS
- Official PDF visual inspection: PASS (7/7)
- Raw source PDFs modified or deleted: 0
```

- [ ] **Step 7: Commit the Phase 1 release state**

```bash
git add content/tmua docs/content/TMUA_CORPUS_REPORT.md docs/content/TMUA_PHASE1_VERIFICATION.md
git commit -m "chore: verify TMUA corpus phase 1"
```

- [ ] **Step 8: Final verification against the committed tree**

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm verify:tmua-corpus
git status --short
```

Expected: all commands PASS; `git status` shows only the intentionally untracked raw `Tmua/` directory and any pre-existing `.DS_Store`, with no modified tracked file.

## Phase 1 Completion Gate

Phase 1 is complete only when:

- every one of the 96 baseline PDF paths is represented;
- every one of the 46 baseline unique contents has a canonical source record;
- seven current/missing official documents have been synchronized and visually verified;
- all 18 paper records are complete;
- all manifests and taxonomy files validate;
- the corpus verifier exits 0;
- the human-readable report contains exact counts and has a companion verification-evidence record;
- no raw source PDF has been moved, rewritten, deleted, or accidentally committed.

Question-level extraction, formula reconstruction, diagram assets, and 360 independently reviewed question records remain a separate Phase 2 implementation plan.
