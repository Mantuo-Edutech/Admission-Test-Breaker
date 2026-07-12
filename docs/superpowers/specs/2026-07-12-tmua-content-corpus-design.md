# TMUA Content Corpus Design

**Status:** Draft for user review

**Date:** 2026-07-12

**Scope:** Organize the complete local TMUA document collection into a traceable, machine-readable corpus without modifying or deleting the source PDFs.

## 1. Context

The repository currently contains a `Tmua/` directory with teaching materials, a topic-organized workbook, answer mappings, official preparation notes, historic papers, answer keys, and worked solutions.

The baseline audit on 2026-07-12 found:

- 96 PDF files;
- 46 unique file contents by SHA-256;
- a 158-page student textbook;
- a 272-page student workbook;
- a 3-page workbook answer map;
- historic papers for Specimen, 2016 Practice, and 2017-2023, with both Paper 1 and Paper 2 present;
- answer keys for the same paper sets;
- worked solutions for Specimen, 2016 Practice, and 2017-2021;
- four missing worked-solution documents: 2022 Paper 1, 2022 Paper 2, 2023 Paper 1, and 2023 Paper 2;
- approximately 270 distinct historic questions already reorganized by topic in the student workbook.

The user has confirmed that the teaching materials are original or cleared for use. Source provenance will still be preserved because original teaching work, official material, and editorial compilation represent different content classes and need different attribution and maintenance rules.

## 2. Objectives

The corpus must:

1. preserve every source PDF exactly as supplied;
2. identify byte-identical duplicates without deleting them;
3. provide one canonical record for every unique source;
4. document the completeness of the local historic-paper archive against the official UAT-UK archive;
5. retrieve the four missing official worked solutions and current official reference documents;
6. represent questions, answers, explanations, source relationships, and teaching classifications in stable schemas;
7. extract the first version of a TMUA knowledge and skill taxonomy from the textbook, workbook, and official specification;
8. distinguish required material, supporting material, and extension material;
9. produce human-readable audit reports and machine-readable manifests;
10. provide deterministic validation commands that any development or verification agent can run.

## 3. Non-goals

This work does not:

- move, rename, delete, or rewrite the existing PDFs;
- publish the PDFs to a public website;
- claim that an automatically extracted mathematical question is ready for students;
- assign psychometric difficulty from editorial judgment alone;
- treat historic raw-score conversion tables as current TMUA score predictions;
- implement the student practice application, account system, benchmark model, or paid interpretation layer;
- scrape or reproduce current Pearson test-player content that is not distributed as a downloadable document.

## 4. Source-of-truth Strategy

### 4.1 Immutable raw layer

The existing `Tmua/` directory remains the immutable raw source layer. New files downloaded from official sources will be stored under `Tmua/official-sources/`. Existing duplicate files remain present.

No derived record may use an absolute machine path. All references use repository-relative paths so the corpus remains portable.

### 4.2 Canonical source selection

Every PDF receives a SHA-256 digest. Files with the same digest form one duplicate group. The canonical member is chosen deterministically:

1. prefer a filename without a `(1)` suffix;
2. prefer the directory that best matches the document type;
3. if both are equivalent, choose the lexicographically first repository-relative path.

All other paths remain represented in `duplicate-map.json` and point to the canonical source ID.

### 4.3 Provenance classes

Each source is assigned one of these values:

- `original_teaching`: original textbook, explanation, or teaching framework;
- `original_compilation`: original selection, ordering, topic mapping, or answer mapping over other materials;
- `official_source`: historic papers, official answer keys, official worked solutions, specifications, and official notes;
- `licensed_external`: permitted third-party material that is neither original nor an official UAT source.

The provenance class is descriptive metadata. It does not remove the user's declaration that the materials are cleared for use.

## 5. Target Repository Structure

```text
content/tmua/
├── README.md
├── corpus-manifest.json
├── schemas/
│   ├── source.schema.json
│   ├── paper.schema.json
│   ├── question.schema.json
│   └── taxonomy.schema.json
├── sources/
│   ├── original-materials.json
│   ├── official-materials.json
│   └── duplicate-map.json
├── past-papers/
│   └── index.json
├── taxonomy/
│   ├── knowledge-tree.yaml
│   ├── skill-tags.yaml
│   └── error-types.yaml
├── questions/
│   ├── specimen/
│   ├── 2016/
│   ├── 2017/
│   ├── 2018/
│   ├── 2019/
│   ├── 2020/
│   ├── 2021/
│   ├── 2022/
│   └── 2023/
├── explanations/
├── benchmark/
└── validation/
```

Human-readable audit output will be written to:

```text
docs/content/TMUA_CORPUS_REPORT.md
```

## 6. Manifest Models

### 6.1 Source record

Each unique PDF has a source record containing:

- stable source ID;
- repository-relative canonical path;
- all duplicate paths;
- SHA-256 digest;
- file size and page count;
- PDF title, author, creator, producer, and creation date where available;
- document type;
- provenance class;
- year, paper number, and question range where applicable;
- whether it contains questions, answer keys, worked solutions, teaching material, or specification content;
- official source URL when applicable;
- retrieval date for downloaded sources;
- rights and attribution note;
- processing status and review status.

Source IDs are semantic when possible, for example:

```text
tmua-official-2022-paper-1
tmua-official-2022-paper-1-worked-solutions
tmua-original-student-textbook-v1
tmua-original-topic-workbook-v1
```

### 6.2 Paper record

Each paper set has:

- `exam`: `TMUA`;
- `edition`: `specimen`, `practice-2016`, or calendar year;
- `paper`: `1` or `2`;
- expected question count: 20;
- duration: 75 minutes;
- question source ID;
- answer-key source ID;
- worked-solution source ID;
- completeness status;
- extraction status;
- validation status.

The expected historic corpus is 18 papers and 360 questions:

- Specimen: 2 papers;
- 2016 Practice: 2 papers;
- 2017-2023: 14 papers.

This count is a validation expectation, not a substitute for inspecting the documents.

### 6.3 Question record

Each question record contains:

```json
{
  "id": "tmua-2021-p2-q08",
  "exam": "TMUA",
  "edition": "2021",
  "paper": 2,
  "questionNumber": 8,
  "sourceType": "past_paper",
  "prompt": null,
  "options": [],
  "correctAnswer": null,
  "questionSourceId": "tmua-official-2021-paper-2",
  "answerSourceId": "tmua-official-2021-answer-key",
  "workedSolutionSourceId": "tmua-official-2021-paper-2-worked-solutions",
  "knowledgeTags": [],
  "skillTags": [],
  "errorTypes": [],
  "syllabusLevel": "CORE",
  "extractionStatus": "not_started",
  "reviewStatus": "needs_review"
}
```

The initial question record may contain references without extracted prompt text. A question becomes publishable only after its prompt, options, diagrams, answer, and solution references pass human or independently verified review.

## 7. Official Archive Reconciliation

The official UAT-UK historic archive currently provides Specimen, 2016, and 2017-2023 material. No 2024 or 2025 past papers are published in the archive as of 2026-07-12.

The local collection already has all 18 question papers and the corresponding answer keys. The local worked-solution set is missing:

- 2022 Paper 1 worked solutions;
- 2022 Paper 2 worked solutions;
- 2023 Paper 1 worked solutions;
- 2023 Paper 2 worked solutions.

These four PDFs will be retrieved only from the official UAT-UK host. Their source URLs, hashes, page counts, and retrieval dates will be recorded.

The official materials index will also record:

- the current TMUA content specification linked by UAT-UK;
- current Notes on Mathematics;
- current Notes on Logic and Proof;
- current specimen/practice-test URLs;
- whether each resource is a local file or link-only resource.

## 8. Taxonomy Design

### 8.1 Knowledge tree

The first hierarchy follows the official content specification while preserving the more detailed teaching subdivisions found in the textbook and workbook.

Top-level areas include:

- Algebra and Functions;
- Sequences and Series;
- Coordinate Geometry;
- Trigonometry;
- Exponentials and Logarithms;
- Differentiation;
- Integration;
- Graphs of Functions;
- Mathematical Logic;
- Mathematical Proof;
- Errors in Proof;
- Higher GCSE supporting knowledge from the official Part 2 specification.

Each topic receives:

- stable ID;
- display name;
- parent topic;
- official specification references;
- teaching-material references;
- `CORE`, `SUPPORT`, or `EXTENSION` level;
- prerequisite topic IDs;
- aliases and common terminology.

### 8.2 Skill tags

Skill tags describe what a learner must do, rather than only what topic a question mentions. Initial families include:

- algebraic transformation;
- representation switching;
- diagram interpretation;
- condition checking;
- counterexample construction;
- necessary and sufficient reasoning;
- proof sequencing;
- approximation and estimation;
- option elimination;
- multi-step planning;
- time-sensitive calculation;
- error detection.

### 8.3 Error types

Error types support future analytics and AI interpretation. Initial families include:

- knowledge gap;
- invalid inference;
- condition omitted;
- sign or inequality reversal;
- algebraic manipulation;
- diagram misread;
- calculation slip;
- premature approximation;
- distractor attraction;
- time-pressure guess;
- answer-transfer error;
- unresolved or insufficient evidence.

The taxonomy can evolve, but stable IDs must never be reused for a different meaning.

## 9. Extraction and Review Pipeline

The corpus pipeline is:

```text
PDF inventory
→ hash and metadata extraction
→ duplicate grouping
→ source classification
→ paper/answer/solution linking
→ question shell generation
→ text, option, formula, and diagram extraction
→ answer reconciliation
→ taxonomy tagging
→ independent validation
→ publishable status
```

Automatic extraction is never treated as authoritative for mathematical notation or diagrams. Every extracted field carries a status:

- `not_started`;
- `auto_extracted`;
- `needs_review`;
- `verified`;
- `rejected`.

The pipeline must be resumable and idempotent. Re-running it may enrich records but must not create duplicate question IDs or overwrite verified human corrections without an explicit migration.

## 10. Validation Architecture

The validation layer is separate from content-generation logic and produces both a non-zero process exit status and a machine-readable report when blocking checks fail.

Planned commands:

```text
verify:tmua-files
verify:tmua-questions
verify:tmua-solutions
verify:tmua-taxonomy
verify:tmua-corpus
```

### 10.1 File validation

Checks include:

- every manifest path exists;
- every digest matches the file;
- every duplicate path has the same digest as its canonical source;
- no canonical source ID is duplicated;
- PDF page counts and metadata remain stable unless a reviewed update is recorded;
- all official downloads use allowlisted UAT-UK URLs.

### 10.2 Paper validation

Checks include:

- all 18 expected paper records exist;
- each paper expects 20 questions;
- each paper links to a question source and answer key;
- each available worked solution is correctly linked;
- missing resources are explicit and never silently treated as complete.

### 10.3 Question validation

Checks include:

- stable IDs match edition, paper, and question number;
- question numbers are unique within each paper;
- options use unique labels;
- correct answers reference a valid option;
- answer keys agree across all available sources;
- figures have explicit asset references and alternative descriptions before publication;
- verified records contain no unresolved extraction placeholders.

### 10.4 Taxonomy validation

Checks include:

- all taxonomy IDs are unique;
- parent references exist and contain no cycles;
- every verified question has at least one knowledge tag and one skill tag;
- `EXTENSION` material is not selected for benchmark core coverage;
- deprecated tags retain migration mappings.

### 10.5 Release gates

P0 blocking failures include:

- missing canonical files;
- digest mismatch;
- conflicting answers;
- duplicated question IDs;
- broken source provenance;
- a question marked publishable while still requiring review;
- formula or diagram extraction not independently verified.

P1 failures may be overridden only with a recorded reason and expiry date. Examples include incomplete non-core taxonomy coverage or a missing optional explanation.

## 11. Error Handling and Auditability

The organizer must never partially rewrite a verified record after a failure. It writes derived output atomically and preserves the previous valid corpus on validation failure.

Every generated or modified record includes:

- generation timestamp;
- tool or agent identifier;
- source IDs used;
- schema version;
- review actor and review time where applicable;
- change reason.

Conflicting answer keys create a blocking discrepancy record rather than choosing one automatically. Unreadable PDF pages, missing fonts, malformed annotations, and OCR uncertainty create review tasks with page references.

## 12. Phased Delivery

### Phase 1: Corpus foundation

Deliver:

1. complete PDF manifest;
2. canonical-source and duplicate maps;
3. official archive completeness matrix;
4. four missing worked-solution PDFs;
5. indexes for original and official materials;
6. first taxonomy version;
7. JSON Schemas;
8. deterministic corpus validator;
9. `TMUA_CORPUS_REPORT.md`.

Phase 1 acceptance criteria:

- all 96 existing PDFs are represented;
- all 46 existing unique contents have canonical source records;
- no existing source PDF is moved, modified, or deleted;
- all four missing worked solutions are retrieved and recorded;
- all 18 historic papers have complete paper records;
- the taxonomy passes structural validation;
- the full corpus validator produces a reproducible report.

### Phase 2: Question-level structuring

Deliver:

1. 360 question shells;
2. extracted prompts, options, answer links, and diagram assets;
3. answer reconciliation;
4. question-to-topic mappings from the workbook;
5. review status for every field;
6. publishable records only for independently verified questions.

### Phase 3: Teaching and benchmark enrichment

Deliver:

1. structured textbook lessons;
2. misconception and error-type mappings;
3. solution-strategy annotations;
4. representative-question selection;
5. difficulty and timing fields derived from platform data;
6. benchmark snapshots with sample size, confidence, and version metadata.

## 13. Design Decisions

- Preserve raw files; organize through manifests instead of destructive moves.
- Keep duplicates visible but attach them to one canonical source.
- Use the official specification as the core syllabus authority and the teaching materials as an enrichment layer.
- Preserve all valuable material, including out-of-syllabus content, by labeling it `EXTENSION` instead of removing it.
- Treat PDF extraction as a draft and require independent verification for mathematics and figures.
- Keep current Pearson web practice resources link-only unless officially distributed as downloadable files.
- Separate document organization from future student-facing publication.
- Make validation deterministic and runnable by any agent.

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Duplicate files inflate counts | SHA-256 canonicalization and duplicate map |
| PDF text extraction corrupts formulae | Page rendering plus independent field review |
| Official and original materials are conflated | Explicit provenance class and source IDs |
| Topic workbook mapping is mistaken for question ownership | Separate question source from compilation metadata |
| Over-broad teaching content distorts preparation | `CORE`, `SUPPORT`, and `EXTENSION` levels |
| Historic grade conversions are treated as current scores | Store as historical references only |
| Agents silently overwrite reviewed content | Immutable review status and explicit migrations |
| Missing sources appear complete | Blocking completeness checks and discrepancy records |

## 15. Completion Definition

This design is complete when the repository contains a reproducible and validated map from every raw TMUA source to canonical documents, paper sets, question records, explanations, and taxonomy nodes, while preserving the original files and clearly distinguishing automatic extraction from verified content.
