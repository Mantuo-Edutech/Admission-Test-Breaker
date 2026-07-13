# TMUA 2023 Paper 1 Complete Mock Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, responsive, locally runnable student experience for the complete verified 20-question TMUA 2023 Paper 1, with a 75-minute session, recovery, submission, and honest results.

**Architecture:** Add a React/Vite single-page experience on top of the existing strict TypeScript repository. Keep reviewed question content, framework-free session domain logic, browser storage, and React pages behind explicit interfaces so future authentication and server persistence can replace adapters without rewriting the experience.

**Tech Stack:** Node 22, pnpm 10.14, TypeScript 5.9, Vite, React, React Router, Radix Dialog, KaTeX, Lucide, Vitest, Testing Library, jsdom, custom CSS.

## Global Constraints

- Use the complete `TMUA 2023 Paper 1`: exactly 20 questions and a 75-minute duration.
- Question source is `Tmua/2016-2023paper/tmua-paper-1-2023.pdf`; answer source is `Tmua/2016-2023 answer key/tmua-2023.pdf`.
- Do not move, rename, delete, rewrite, or commit any existing raw PDF under `Tmua/`.
- Every runnable question must be visually checked against its rendered source page and have `reviewStatus: "verified"`.
- The official Paper 1 answer sequence is `F,A,C,C,F,E,F,B,E,B,B,F,F,A,F,E,E,E,D,F` for questions 1 through 20.
- Do not persist absolute machine paths in code, content, reports, or browser state.
- Reject empty, absolute, drive-letter, backslash, and parent-traversal provenance paths.
- Do not show answers or explanations before deliberate submission or timer expiry.
- Do not fabricate a percentile, TMUA score prediction, readiness estimate, benchmark, or AI interpretation.
- First-version persistence is device-local and must be labeled as such.
- Remaining time is derived from the persisted deadline, not a decrementing counter.
- Finalization must be idempotent.
- Phone, iPad portrait/landscape, and desktop retain full answering, marking, navigation, and submission behavior.
- Use Mantou purple `#63528C`, deep ink `#282332`, slate `#76777A`, warm paper `#F7F1E7`, and raised paper `#FFFDF8` as the baseline palette.
- Use native semantics or mature accessible primitives; touch targets are at least 44 by 44 pixels.
- Respect `prefers-reduced-motion`.
- Follow TDD for every behavior: write the focused test, observe the expected failure, implement minimally, rerun focused and full gates, then commit.
- Existing corpus tests and strict typechecking must remain green after every task.

## Target File Structure

```text
index.html                                      Vite HTML entry
vite.config.ts                                 React build and jsdom test configuration
src/app/main.tsx                               Browser mount
src/app/App.tsx                                Router composition
src/app/routes.tsx                             Route creation for browser and tests
src/app/test-setup.ts                          Testing Library matchers and cleanup
src/features/practice/content/types.ts         Safe question block and paper contracts
src/features/practice/content/validate.ts      Build-blocking content validation
src/features/practice/content/tmua-2023-p1.ts  Twenty reviewed question records
src/features/practice/domain/session.ts        Session state and events
src/features/practice/domain/reducer.ts        Pure state transitions
src/features/practice/domain/results.ts        Deterministic result calculation
src/features/practice/domain/timer.ts          Deadline-derived remaining time
src/features/practice/storage/store.ts         PracticeSessionStore interface
src/features/practice/storage/local-store.ts   Versioned local-storage adapter
src/features/practice/components/*             Math, choices, timer, progress, map, dialogs
src/features/practice/pages/LandingPage.tsx     Product-first entry and recovery action
src/features/practice/pages/PracticePage.tsx    Full mock controller and responsive shell
src/features/practice/pages/ResultsPage.tsx     Evidence-only session report
src/styles/tokens.css                           Brand and breakpoint tokens
src/styles/global.css                           Typography and shared element styles
src/styles/practice.css                         Landing, exam, results responsive layouts
public/brand/mantou-logo.png                    Approved supplied Mantou logo asset
public/questions/tmua-2023-p1/*.svg             Reviewed diagrams required by the paper
tests/app/*                                     Route and screen tests
tests/features/practice/content/*               Content contract and answer checks
tests/features/practice/domain/*                Reducer, timer, and results tests
tests/features/practice/storage/*               Recovery and corruption tests
tests/features/practice/components/*            Student interaction tests
docs/content/TMUA_2023_P1_CONTENT_VERIFICATION.md  Per-question source evidence
```

---

## Task 1: Establish the Web Runtime and Harden Shared Contracts

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.json`
- Delete: `vitest.config.ts`
- Modify: `content/tmua/schemas/source.schema.json`
- Modify: `tests/content/tmua/schema.test.ts`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `src/app/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/routes.tsx`
- Create: `src/app/test-setup.ts`
- Create: `tests/app/app-shell.test.tsx`

**Interfaces:**
- Consumes: existing pnpm/Vitest/TypeScript harness.
- Produces: `createAppRouter(initialEntries?: string[]): Router`, browser `App`, `pnpm dev`, `pnpm build`, jsdom component tests, and safe repository-relative provenance schema rules.

- [ ] **Step 1: Write failing safe-path schema cases**

Extend `tests/content/tmua/schema.test.ts` with a valid source fixture and invalid paths:

```ts
const sourceFixture = {
  id: "tmua-official-2023-paper-1",
  canonicalPath: "Tmua/2016-2023paper/tmua-paper-1-2023.pdf",
  duplicatePaths: [],
  sha256: "a".repeat(64),
  fileSize: 1,
  metadata: { pages: 24 },
  provenance: "official_source",
  documentType: "question_paper",
  reviewStatus: "verified",
  audit: {
    generatedAt: "2026-07-13T00:00:00.000Z",
    generatedBy: "tmua-corpus-cli",
    schemaVersion: 1,
    changeReason: "test fixture",
  },
};

it.each(["", "../escape.pdf", "/private/a.pdf", "C:\\private.pdf", "Tmua\\paper.pdf"])(
  "rejects unsafe canonical path %j",
  async (canonicalPath) => {
    const schema = JSON.parse(
      await readFile("content/tmua/schemas/source.schema.json", "utf8"),
    );
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate({ ...sourceFixture, canonicalPath })).toBe(false);
  },
);
```

- [ ] **Step 2: Run the schema test and verify the unsafe paths fail the test**

Run: `pnpm test -- tests/content/tmua/schema.test.ts`

Expected: FAIL because the current `^(?!/)` pattern accepts empty, parent-traversal, drive-letter, and backslash paths.

- [ ] **Step 3: Harden the source path pattern**

In `content/tmua/schemas/source.schema.json`, use the same rule for canonical and duplicate paths:

```json
{
  "type": "string",
  "minLength": 1,
  "pattern": "^(?!/)(?![A-Za-z]:)(?!.*(?:^|/)\\.\\.(?:/|$))(?!.*\\\\).+$"
}
```

- [ ] **Step 4: Install and lock the mature UI and test dependencies**

Run:

```bash
pnpm add react react-dom react-router-dom @radix-ui/react-dialog katex lucide-react
pnpm add --save-dev vite @vitejs/plugin-react @types/react @types/react-dom @types/katex jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add to `package.json`:

```json
{
  "packageManager": "pnpm@10.14.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Preserve all existing corpus scripts.

- [ ] **Step 5: Write the failing app-shell test**

Create `tests/app/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../src/app/routes.js";

describe("application shell", () => {
  it("opens on the TMUA experience landing route", async () => {
    render(<RouterProvider router={createAppRouter(["/"])} />);
    expect(
      await screen.findByRole("heading", { name: "把焦虑，拆成每一道题。" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the app-shell test and verify it fails**

Run: `pnpm test -- tests/app/app-shell.test.tsx`

Expected: FAIL because the app router and landing route do not exist.

- [ ] **Step 7: Add the minimal browser entry and route shell**

Create `src/app/routes.tsx`:

```tsx
import { createBrowserRouter, createMemoryRouter } from "react-router-dom";

function LandingPlaceholder() {
  return <h1>把焦虑，拆成每一道题。</h1>;
}

const routes = [{ path: "/", element: <LandingPlaceholder /> }];

export function createAppRouter(initialEntries?: string[]) {
  return initialEntries
    ? createMemoryRouter(routes, { initialEntries })
    : createBrowserRouter(routes);
}
```

Create `src/app/App.tsx`:

```tsx
import { RouterProvider } from "react-router-dom";
import { createAppRouter } from "./routes.js";

const router = createAppRouter();
export function App() {
  return <RouterProvider router={router} />;
}
```

Create `src/app/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
```

Create `src/app/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
```

Create `index.html` with `lang="zh-CN"`, a `#root` element, title `TMUA 练习场`, and module entry `/src/app/main.tsx`.

Create `vite.config.ts` using `@vitejs/plugin-react`, `environment: "jsdom"`, `setupFiles: ["./src/app/test-setup.ts"]`, and the existing 30-second timeout. Delete the superseded `vitest.config.ts` so Vitest and Vite cannot load divergent configurations.

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 8: Run foundation gates**

Run:

```bash
pnpm test -- tests/content/tmua/schema.test.ts tests/app/app-shell.test.tsx
pnpm typecheck
pnpm build
```

Expected: all commands PASS and `dist/index.html` exists.

- [ ] **Step 9: Commit the web foundation**

```bash
git add -A package.json pnpm-lock.yaml tsconfig.json vitest.config.ts index.html vite.config.ts content/tmua/schemas/source.schema.json tests/content/tmua/schema.test.ts src/app tests/app
git commit -m "build: establish TMUA web experience"
```

---

## Task 2: Encode and Block-Validate All Twenty Reviewed Questions

**Files:**
- Create: `src/features/practice/content/types.ts`
- Create: `src/features/practice/content/validate.ts`
- Create: `src/features/practice/content/tmua-2023-p1.ts`
- Create: `public/questions/tmua-2023-p1/q05.svg`
- Create: `public/questions/tmua-2023-p1/q17.svg`
- Create: `public/questions/tmua-2023-p1/q20.svg`
- Create: `tests/features/practice/content/paper.test.ts`
- Create: `docs/content/TMUA_2023_P1_CONTENT_VERIFICATION.md`

**Interfaces:**
- Consumes: immutable source and answer PDFs from the global constraints.
- Produces: `QuestionBlock`, `PracticeQuestion`, `PracticePaper`, `TMUA_2023_P1`, `validatePracticePaper(paper): ValidationIssue[]`, and three reviewed diagram assets.

- [ ] **Step 1: Define the desired content test before production types**

Create `tests/features/practice/content/paper.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TMUA_2023_P1 } from "../../../../src/features/practice/content/tmua-2023-p1.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

const expectedAnswers = "FACCFEFBEBBFFAFEEEDF".split("");

describe("TMUA 2023 Paper 1 reviewed content", () => {
  it("contains the complete contiguous paper and reviewed answer sequence", () => {
    expect(TMUA_2023_P1.durationMinutes).toBe(75);
    expect(TMUA_2023_P1.questions).toHaveLength(20);
    expect(TMUA_2023_P1.questions.map((question) => question.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(TMUA_2023_P1.questions.map((question) => question.correctAnswer)).toEqual(
      expectedAnswers,
    );
    expect(TMUA_2023_P1.questions.every((question) => question.reviewStatus === "verified")).toBe(true);
    expect(validatePracticePaper(TMUA_2023_P1)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the content test and verify it fails**

Run: `pnpm test -- tests/features/practice/content/paper.test.ts`

Expected: FAIL because the content modules do not exist.

- [ ] **Step 3: Add safe content types**

Create `src/features/practice/content/types.ts`:

```ts
export type InlineRun =
  | { kind: "text"; value: string }
  | { kind: "math"; tex: string };

export type QuestionBlock =
  | { kind: "paragraph"; runs: InlineRun[] }
  | { kind: "display-math"; tex: string }
  | { kind: "figure"; src: string; alt: string; caption?: string };

export interface PracticeOption {
  label: string;
  content: QuestionBlock[];
}

export interface PracticeQuestion {
  id: string;
  number: number;
  sourcePage: number;
  prompt: QuestionBlock[];
  options: PracticeOption[];
  correctAnswer: string;
  knowledgeTags: string[];
  skillTags: string[];
  reviewStatus: "verified";
  sourceQuestionPath: string;
  sourceAnswerPath: string;
}

export interface PracticePaper {
  id: "tmua-2023-p1";
  exam: "TMUA";
  edition: "2023";
  paper: 1;
  durationMinutes: 75;
  questions: PracticeQuestion[];
}

export interface ValidationIssue {
  code: string;
  questionId?: string;
  message: string;
}
```

- [ ] **Step 4: Write validation tests for unsafe and incomplete content**

Add focused fixtures to `paper.test.ts` proving the validator rejects:

```ts
it("rejects unsafe provenance and a correct answer outside the options", () => {
  const broken = structuredClone(TMUA_2023_P1);
  broken.questions[0]!.sourceQuestionPath = "../outside.pdf";
  broken.questions[0]!.correctAnswer = "Z";
  expect(validatePracticePaper(broken).map((issue) => issue.code)).toEqual(
    expect.arrayContaining(["unsafe-source-path", "missing-correct-option"]),
  );
});
```

Initially use a minimal one-question local fixture inside the test until the complete paper module exists so the RED failure is caused by missing validation behavior, not by TypeScript syntax.

- [ ] **Step 5: Implement deterministic content validation**

Create `src/features/practice/content/validate.ts` with:

```ts
import type { PracticePaper, ValidationIssue } from "./types.js";

const safeRelativePath = /^(?!\/)(?![A-Za-z]:)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+$/;

export function validatePracticePaper(paper: PracticePaper): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expectedNumbers = Array.from({ length: 20 }, (_, index) => index + 1);
  const numbers = paper.questions.map((question) => question.number);
  if (paper.questions.length !== 20) issues.push({ code: "question-count", message: "Paper must contain 20 questions" });
  if (JSON.stringify(numbers) !== JSON.stringify(expectedNumbers)) issues.push({ code: "question-sequence", message: "Question numbers must be 1 through 20" });
  if (new Set(paper.questions.map((question) => question.id)).size !== paper.questions.length) issues.push({ code: "duplicate-question-id", message: "Question IDs must be unique" });
  for (const question of paper.questions) {
    const labels = question.options.map((option) => option.label);
    if (question.id !== `tmua-2023-p1-q${String(question.number).padStart(2, "0")}`) issues.push({ code: "question-id", questionId: question.id, message: "Question ID must match paper and number" });
    if (question.reviewStatus !== "verified") issues.push({ code: "unverified-question", questionId: question.id, message: "Runnable questions must be verified" });
    if (new Set(labels).size !== labels.length) issues.push({ code: "duplicate-option", questionId: question.id, message: "Option labels must be unique" });
    if (!labels.includes(question.correctAnswer)) issues.push({ code: "missing-correct-option", questionId: question.id, message: "Correct answer must reference an option" });
    if (!question.prompt.length || question.options.some((option) => !option.content.length)) issues.push({ code: "empty-content", questionId: question.id, message: "Prompt and option content are required" });
    for (const path of [question.sourceQuestionPath, question.sourceAnswerPath]) {
      if (!safeRelativePath.test(path)) issues.push({ code: "unsafe-source-path", questionId: question.id, message: "Source paths must be safe and repository-relative" });
    }
  }
  return issues;
}
```

- [ ] **Step 6: Render and visually inspect all source question pages before transcription**

Run:

```bash
mkdir -p tmp/pdfs/tmua-2023-p1-review
pdftoppm -f 3 -l 22 -png -r 160 "Tmua/2016-2023paper/tmua-paper-1-2023.pdf" "tmp/pdfs/tmua-2023-p1-review/page"
pdftotext -f 3 -l 22 -layout "Tmua/2016-2023paper/tmua-paper-1-2023.pdf" -
pdftotext -layout "Tmua/2016-2023 answer key/tmua-2023.pdf" -
```

Inspect every rendered PNG. Treat the rendered page, not extracted text, as authoritative. Pay extra attention to questions 4, 5, 7, 8, 10, 12, 13, 14, 15, 17, 18, 19, and 20 because superscripts, radicals, fractions, absolute values, or figures are material to the answer.

- [ ] **Step 7: Create the complete reviewed paper module**

Create `src/features/practice/content/tmua-2023-p1.ts` with one record for every source page 3 through 22. Use repository-relative provenance paths from the global constraints, `reviewStatus: "verified"`, and the exact answer sequence `FACCFEFBEBBFFAFEEEDF`.

Use these reviewed knowledge families in order:

```ts
const knowledgeByQuestion = [
  "integration", "quadratics", "integration", "sequences-series", "geometry-optimization",
  "binomial-expansion", "exponentials-logarithms", "trigonometry-geometry", "trigonometric-equations", "numerical-integration",
  "function-transformations", "trigonometric-equations", "coordinate-geometry-circles", "cubic-functions", "exponentials-range",
  "coordinate-geometry", "circle-sequences", "geometric-series-probability", "differential-equations", "function-range",
] as const;
```

Use `QuestionBlock` paragraphs and KaTeX strings instead of raw HTML. For the three source diagrams, reference `/questions/tmua-2023-p1/q05.svg`, `/questions/tmua-2023-p1/q17.svg`, and `/questions/tmua-2023-p1/q20.svg`, with complete alt text describing all labeled points and relationships required to answer.

The module must evaluate its own validity at import time in development and tests:

```ts
const issues = validatePracticePaper(TMUA_2023_P1);
if (issues.length) throw new Error(`Invalid TMUA 2023 Paper 1: ${JSON.stringify(issues)}`);
```

- [ ] **Step 8: Create reviewed SVG diagrams**

Create accessible, responsive SVG assets that reproduce only the mathematical information shown in the source:

- `q05.svg`: outer square `MNOP`, inner rectangle `RSTU`, correct vertex labels, and “diagram not to scale” caption;
- `q17.svg`: coordinate axes and the representative nested circles with alternating shaded annular regions;
- `q20.svg`: graph of `y=f(x)` with extrema labeled `(-1,-2)` and `(1,2)`.

Each SVG must have a `viewBox`, use `currentColor`-compatible ink strokes where possible, contain no external links or scripts, and remain legible at 320 CSS pixels.

- [ ] **Step 9: Record the per-question source verification**

Create `docs/content/TMUA_2023_P1_CONTENT_VERIFICATION.md` with a 20-row table containing question number, PDF page, answer, formula/diagram risk, reviewer status, and the exact rendered page filename inspected. All rows must say `verified`; anything else blocks the task.

- [ ] **Step 10: Run content gates**

Run:

```bash
pnpm test -- tests/features/practice/content/paper.test.ts
pnpm test
pnpm typecheck
```

Expected: all commands PASS; the test reports exactly 20 questions and the official answer sequence.

- [ ] **Step 11: Commit verified content**

```bash
git add src/features/practice/content public/questions/tmua-2023-p1 tests/features/practice/content docs/content/TMUA_2023_P1_CONTENT_VERIFICATION.md
git commit -m "feat: add verified TMUA 2023 Paper 1"
```

---

## Task 3: Implement the Session Domain, Timer, Results, and Recovery Store

**Files:**
- Create: `src/features/practice/domain/session.ts`
- Create: `src/features/practice/domain/reducer.ts`
- Create: `src/features/practice/domain/timer.ts`
- Create: `src/features/practice/domain/results.ts`
- Create: `src/features/practice/storage/store.ts`
- Create: `src/features/practice/storage/local-store.ts`
- Create: `tests/features/practice/domain/session.test.ts`
- Create: `tests/features/practice/domain/timer.test.ts`
- Create: `tests/features/practice/domain/results.test.ts`
- Create: `tests/features/practice/storage/local-store.test.ts`

**Interfaces:**
- Consumes: `PracticePaper`, `PracticeQuestion`.
- Produces: `PracticeSession`, `PracticeEvent`, `practiceSessionReducer`, `createPracticeSession`, `remainingTimeMs`, `calculateResults`, `PracticeSessionStore`, `LocalPracticeSessionStore`.

- [ ] **Step 1: Write failing reducer behavior tests**

Create `tests/features/practice/domain/session.test.ts` covering start, answer selection/change, marking, navigation, and idempotent finalization:

```ts
it("records an answer change without losing the original event", () => {
  const started = createPracticeSession("session-1", "2026-07-13T00:00:00.000Z");
  const first = practiceSessionReducer(started, { type: "answer", questionId: "tmua-2023-p1-q01", answer: "A", at: "2026-07-13T00:01:00.000Z" });
  const changed = practiceSessionReducer(first, { type: "answer", questionId: "tmua-2023-p1-q01", answer: "F", at: "2026-07-13T00:02:00.000Z" });
  expect(changed.answers["tmua-2023-p1-q01"]).toBe("F");
  expect(changed.events.map((event) => event.type)).toEqual([
    "session_started", "answer_selected", "answer_changed",
  ]);
});

it("finalizes only once", () => {
  const started = createPracticeSession("session-1", "2026-07-13T00:00:00.000Z");
  const submitted = practiceSessionReducer(started, { type: "submit", at: "2026-07-13T00:10:00.000Z", reason: "student" });
  expect(practiceSessionReducer(submitted, { type: "submit", at: "2026-07-13T00:11:00.000Z", reason: "student" })).toEqual(submitted);
});
```

- [ ] **Step 2: Run reducer tests and verify they fail**

Run: `pnpm test -- tests/features/practice/domain/session.test.ts`

Expected: FAIL because session domain modules do not exist.

- [ ] **Step 3: Define session and event contracts**

Create `src/features/practice/domain/session.ts` with:

```ts
export type PracticeEventType =
  | "session_started" | "question_viewed" | "answer_selected" | "answer_changed"
  | "question_marked" | "question_unmarked" | "submission_opened"
  | "session_submitted" | "session_expired";

export interface PracticeEvent {
  type: PracticeEventType;
  at: string;
  elapsedMs: number;
  questionId?: string;
  answer?: string;
}

export interface PracticeSession {
  schemaVersion: 1;
  id: string;
  paperId: "tmua-2023-p1";
  status: "active" | "submitted" | "expired";
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
  currentQuestion: number;
  answers: Record<string, string>;
  markedQuestionIds: string[];
  timingByQuestionMs: Record<string, number>;
  activeQuestionEnteredAt: string;
  events: PracticeEvent[];
}
```

`createPracticeSession` sets `deadlineAt` to exactly 75 minutes after `startedAt`, current question to 1, empty answers/marks/timing, and a single `session_started` event.

- [ ] **Step 4: Implement the pure reducer minimally**

Create `src/features/practice/domain/reducer.ts` with discriminated actions for `view`, `answer`, `toggle-mark`, `open-submission`, `submit`, and `expire`. Calculate elapsed event time from `startedAt`; accumulate the prior active question's timing on `view`, `submit`, and `expire`; never mutate input state; ignore answer/mark/navigation actions after finalization.

- [ ] **Step 5: Write and implement deadline-derived timer tests**

Create `tests/features/practice/domain/timer.test.ts`:

```ts
it("derives remaining time from deadline and clamps at zero", () => {
  expect(remainingTimeMs("2026-07-13T01:15:00.000Z", "2026-07-13T01:14:30.000Z")).toBe(30_000);
  expect(remainingTimeMs("2026-07-13T01:15:00.000Z", "2026-07-13T01:16:00.000Z")).toBe(0);
});
```

Verify RED, then implement `remainingTimeMs(deadlineAt: string, now: string | number | Date): number` in `timer.ts` using timestamp subtraction and `Math.max(0, ...)`.

- [ ] **Step 6: Write and implement deterministic result tests**

Create `tests/features/practice/domain/results.test.ts` proving correct, incorrect, unanswered, total time, average time, and per-question rows. Implement `calculateResults(paper, session)` in `results.ts`; it must throw when the session is still active and must never infer population benchmark values.

- [ ] **Step 7: Write failing storage recovery tests**

Create a small in-memory `Storage` test double and test that `LocalPracticeSessionStore`:

- round-trips a valid active session;
- returns `{ session: null, issue: null }` when no session exists;
- quarantines malformed JSON under a timestamped `tmua:practice:corrupt:` key;
- rejects an unsupported `schemaVersion`;
- removes only its own current-session key when cleared.
- keeps an in-memory session and returns `{ persisted: false }` when the injected browser storage throws.

- [ ] **Step 8: Implement the storage interface and local adapter**

Create `store.ts`:

```ts
export interface SessionLoadResult {
  session: PracticeSession | null;
  issue: "corrupt" | "unsupported" | null;
}

export interface SessionSaveResult {
  persisted: boolean;
}

export interface PracticeSessionStore {
  loadCurrent(): Promise<SessionLoadResult>;
  save(session: PracticeSession): Promise<SessionSaveResult>;
  clearCurrent(): Promise<void>;
}
```

Create `local-store.ts` using injected `Storage`, key `tmua:practice:current:v1`, an in-memory current-session fallback, strict structural validation for `schemaVersion`, `paperId`, status, dates, answers, marks, timing, and events, and corruption quarantine before returning an issue result. `loadCurrent().session` may be active or finalized; the landing page offers resume only for `status: "active"`, while the result route accepts only a matching finalized session. `save` updates memory first, attempts browser storage, and returns `{ persisted: false }` rather than destroying the usable in-memory session when storage fails.

- [ ] **Step 9: Run domain and storage gates**

Run:

```bash
pnpm test -- tests/features/practice/domain tests/features/practice/storage
pnpm test
pnpm typecheck
```

Expected: all commands PASS.

- [ ] **Step 10: Commit the session foundation**

```bash
git add src/features/practice/domain src/features/practice/storage tests/features/practice/domain tests/features/practice/storage
git commit -m "feat: add recoverable TMUA practice sessions"
```

---

## Task 4: Build the Mantou Academic Design System and Landing Experience

**Files:**
- Create: `public/brand/mantou-logo.png`
- Create: `src/features/practice/components/BrandMark.tsx`
- Create: `src/features/practice/components/AcademicIllustration.tsx`
- Create: `src/features/practice/pages/LandingPage.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/practice.css`
- Modify: `src/app/main.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `tests/app/app-shell.test.tsx`
- Create: `tests/app/landing-page.test.tsx`

**Interfaces:**
- Consumes: `PracticeSessionStore`, active session metadata.
- Produces: responsive landing page, approved brand asset, `BrandMark`, and route navigation to start or resume a session.

- [ ] **Step 1: Write landing interaction tests**

Create `tests/app/landing-page.test.tsx` with an injected in-memory store and router. Prove that:

- the complete-paper facts `20 道题`, `75 分钟`, and `不可使用计算器` are visible;
- “开始完整模考” creates a session and navigates to `/practice/tmua-2023-paper-1`;
- a valid active session reveals “继续上次练习” and its answered count;
- no active session hides the resume action;
- local-only storage copy is visible.
- corrupt/unsupported recovery data produces a calm dismissal notice;
- a `{ persisted: false }` start still navigates and carries a non-blocking “本次无法自动恢复” warning.

- [ ] **Step 2: Run the landing test and verify it fails**

Run: `pnpm test -- tests/app/landing-page.test.tsx`

Expected: FAIL because the landing page does not exist.

- [ ] **Step 3: Add exact design tokens and global styles**

Create `tokens.css` with the approved palette, spacing scale, modest corner radii, serif/sans font stacks, 44-pixel control minimum, warm shadows, and breakpoints at `48rem` and `75rem`. Create `global.css` with box sizing, body paper background, ink foreground, accessible focus ring, button/input inheritance, and reduced-motion override.

- [ ] **Step 4: Add the approved logo and academic illustration**

Copy the user-supplied approved Mantou logo into `public/brand/mantou-logo.png` without altering its pixels. Implement `BrandMark` using that asset and descriptive adjacent text, not by redrawing the mark.

Implement `AcademicIllustration` as decorative semantic-free SVG/CSS containing one arch, desk plane, lamp, books, graph sheet, and geometric construction lines. Use only the approved palette, set `aria-hidden="true"`, and avoid embedded text.

- [ ] **Step 5: Implement the landing page and dependency injection**

`LandingPage` receives a `PracticeSessionStore`, `now()` function, and navigation callback. The production route injects one shared `LocalPracticeSessionStore(window.localStorage)` instance. Tests inject an in-memory implementation. Starting creates a session, awaits the save result, and navigates even in memory-only mode while passing a recovery-warning route state; recovery uses the existing ID and preserves deadline. A corrupt or unsupported load result shows a dismissal notice instead of silently pretending no prior session existed.

The first viewport contains:

- `把焦虑，拆成每一道题。`;
- `TMUA 2023 · Paper 1`;
- the three paper facts;
- primary start action;
- conditional resume action;
- source/year/verified/local-only trust strip;
- the academic illustration.

- [ ] **Step 6: Wire styles and routes**

Import KaTeX CSS, `tokens.css`, `global.css`, and `practice.css` from `main.tsx`. Replace the temporary route element with `LandingPage`; retain route creation that supports dependency injection in tests.

- [ ] **Step 7: Run landing and foundation gates**

Run:

```bash
pnpm test -- tests/app/app-shell.test.tsx tests/app/landing-page.test.tsx
pnpm test
pnpm typecheck
pnpm build
```

Expected: all commands PASS.

- [ ] **Step 8: Commit the branded entry experience**

```bash
git add public/brand src/features/practice/components src/features/practice/pages/LandingPage.tsx src/styles src/app tests/app
git commit -m "feat: add Mantou TMUA landing experience"
```

---

## Task 5: Build the Responsive Twenty-Question Mock Interface

**Files:**
- Create: `src/features/practice/components/MathContent.tsx`
- Create: `src/features/practice/components/AnswerChoice.tsx`
- Create: `src/features/practice/components/QuestionCard.tsx`
- Create: `src/features/practice/components/QuestionMap.tsx`
- Create: `src/features/practice/components/ExamTimer.tsx`
- Create: `src/features/practice/components/ExamHeader.tsx`
- Create: `src/features/practice/pages/PracticePage.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/styles/practice.css`
- Create: `tests/features/practice/components/question-card.test.tsx`
- Create: `tests/features/practice/components/question-map.test.tsx`
- Create: `tests/app/practice-page.test.tsx`

**Interfaces:**
- Consumes: `TMUA_2023_P1`, active `PracticeSession`, reducer, store, deadline timer.
- Produces: full accessible answering, marking, keyboard navigation, autosave, expiry, and responsive question-map behavior.

- [ ] **Step 1: Write failing math and answer interaction tests**

Create `question-card.test.tsx` proving:

- paragraph text and KaTeX output render;
- figure alt text renders for a diagram question;
- each option is a named radio control;
- clicking or pressing its shortcut selects exactly one answer;
- selected state is visible but correctness is absent before submission;
- disabled/finalized state prevents changes.

- [ ] **Step 2: Run the question-card test and verify it fails**

Run: `pnpm test -- tests/features/practice/components/question-card.test.tsx`

Expected: FAIL because content renderer and question components do not exist.

- [ ] **Step 3: Implement safe math and question rendering**

`MathContent` maps trusted block unions without `dangerouslySetInnerHTML` for prose. Render reviewed TeX with `renderToString(tex, { throwOnError: false, strict: "warn", trust: false })`; only the KaTeX result enters a component-owned `dangerouslySetInnerHTML` span. When KaTeX reports an error, show the original TeX source as text and emit a development warning.

`QuestionCard` uses a `fieldset` and `legend`, renders `AnswerChoice` labels with native radio inputs, and receives `selectedAnswer`, `onAnswer`, and `finalized` props. Keyboard letter shortcuts are handled only when the event target is not an input, textarea, select, button, or contenteditable element.

- [ ] **Step 4: Write failing question-map tests**

Create `question-map.test.tsx` for current, answered, marked, answered+marked, and unanswered accessible labels. Assert 20 buttons, current uses `aria-current="step"`, and selecting a number invokes navigation.

- [ ] **Step 5: Implement question map and timer**

`QuestionMap` renders an ordered 20-button grid with both icon/text state and color. `ExamTimer` recomputes from deadline every second while visible, announces only 10-minute, 5-minute, and 1-minute thresholds, formats `MM:SS`, and calls `onExpire` once when zero is reached.

- [ ] **Step 6: Write failing practice-page journey tests**

Create `practice-page.test.tsx` with fake timers and an in-memory store. Prove:

- missing active session routes home with a recovery message;
- an active session opens its persisted current question;
- selecting an answer saves it and updates progress;
- next/previous and question map navigate;
- marking updates both question action and map;
- re-rendering from the stored session restores answers and deadline;
- advancing beyond deadline finalizes with status `expired` and routes to results;
- answers/correctness are not visible before finalization.
- a memory-only save keeps the session usable and shows a non-blocking recovery warning.

- [ ] **Step 7: Implement the practice-page controller**

Use `useReducer(practiceSessionReducer, loadedSession)`. Load before showing question content; render a branded calm loading state rather than a flash of empty question. Persist immediately after answer/mark/finalize and debounce passive navigation timing updates. Flush the current state on `visibilitychange` when hidden. When `save` returns `{ persisted: false }`, keep the reducer state and show “本次练习仍可继续，但刷新或关闭页面后可能无法恢复。” without blocking the question.

Desktop layout uses persistent question rail. CSS at tablet portrait/mobile collapses it into a Radix Dialog opened by “题目 7 / 20”. Mobile retains a sticky bottom bar for previous, mark, and next. All breakpoints preserve submit access.

- [ ] **Step 8: Run mock-interface gates**

Run:

```bash
pnpm test -- tests/features/practice/components tests/app/practice-page.test.tsx
pnpm test
pnpm typecheck
pnpm build
```

Expected: all commands PASS.

- [ ] **Step 9: Commit the full mock interface**

```bash
git add src/features/practice/components src/features/practice/pages/PracticePage.tsx src/app/routes.tsx src/styles/practice.css tests/features/practice/components tests/app/practice-page.test.tsx
git commit -m "feat: add complete responsive TMUA mock"
```

---

## Task 6: Add Deliberate Submission and Evidence-Only Results

**Files:**
- Create: `src/features/practice/components/SubmitDialog.tsx`
- Create: `src/features/practice/components/ScoreSummary.tsx`
- Create: `src/features/practice/components/QuestionResultRow.tsx`
- Create: `src/features/practice/pages/ResultsPage.tsx`
- Modify: `src/features/practice/pages/PracticePage.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/styles/practice.css`
- Create: `tests/features/practice/components/submit-dialog.test.tsx`
- Create: `tests/app/results-page.test.tsx`

**Interfaces:**
- Consumes: active/finalized session, paper, `calculateResults`.
- Produces: safe submission confirmation, finalized-session persistence, score/timing/topic summary, and answer review without fabricated benchmark data.

- [ ] **Step 1: Write failing submission-dialog tests**

Test that the Radix dialog:

- shows answered, unanswered, and marked counts;
- names the number of unanswered questions;
- keeps “返回检查” as the non-destructive action;
- calls confirmation exactly once;
- restores focus when canceled;
- contains no correct answers.

- [ ] **Step 2: Run the submission test and verify it fails**

Run: `pnpm test -- tests/features/practice/components/submit-dialog.test.tsx`

Expected: FAIL because the dialog does not exist.

- [ ] **Step 3: Implement submission through the same finalization path as expiry**

`PracticePage` dispatches `open-submission` when the dialog opens and `submit` with reason `student` only after confirmation. Await the immediate store save before navigating to `/results/:sessionId`. Expiry dispatches `expire`, saves, and navigates through the same helper. Disable confirmation during the save to prevent duplicate transitions.

- [ ] **Step 4: Write failing results-page tests**

Create `results-page.test.tsx` for a deterministic finalized session. Assert:

- score `/20`, percentage, correct/incorrect/unanswered, total and average time;
- longest and suspiciously fast question signals use only session timing;
- answer review contains selected and correct answers after submission;
- benchmark area says `样本积累中`;
- no percentile, predicted score, readiness estimate, or AI interpretation appears;
- missing/active/wrong-ID sessions show a recovery state rather than results;
- restart clears the current-session key and returns home.

- [ ] **Step 5: Implement the results components and page**

`ScoreSummary` renders evidence-only totals and timing. `QuestionResultRow` uses accessible status text in addition to color and shows question number, selected answer or `未作答`, correct answer, recorded time, mark state, and knowledge tag. `ResultsPage` loads the finalized session from an injected result repository backed by the local store, checks the route ID, calculates once, and renders recovery states for invalid access.

Render the benchmark card with fixed truthful copy:

```text
群体 Benchmark 样本积累中
当前仅展示这次练习产生的个人数据，不生成虚假排名或分数预测。
```

- [ ] **Step 6: Complete the responsive result and dialog styling**

Desktop uses a score editorial panel beside timing highlights and a readable result list. Mobile stacks summaries before the answer list. The dialog fits small viewports, traps focus through Radix, and never places primary/destructive actions too close without spacing.

- [ ] **Step 7: Run end-to-end component gates**

Run:

```bash
pnpm test -- tests/features/practice/components/submit-dialog.test.tsx tests/app/results-page.test.tsx tests/app/practice-page.test.tsx
pnpm test
pnpm typecheck
pnpm build
```

Expected: all commands PASS.

- [ ] **Step 8: Commit submission and results**

```bash
git add src/features/practice/components src/features/practice/pages src/app/routes.tsx src/styles/practice.css tests/features/practice/components tests/app
git commit -m "feat: add TMUA submission and results"
```

---

## Task 7: Perform the Experience Release Audit

**Files:**
- Modify: `docs/content/TMUA_2023_P1_CONTENT_VERIFICATION.md`
- Create: `docs/content/TMUA_2023_P1_EXPERIENCE_VERIFICATION.md`
- Modify: any implementation or test file only when a release check exposes a defect; every defect fix starts with a failing regression test.

**Interfaces:**
- Consumes: committed application, tests, source PDFs, content-verification table.
- Produces: reproducible release evidence and a locally runnable, visually inspected experience.

- [ ] **Step 1: Verify clean reproducible dependencies**

Run:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm audit --prod
```

Expected: all commands PASS, zero known production vulnerabilities, and the test output contains no React act warnings or unhandled errors.

- [ ] **Step 2: Verify raw corpus immutability**

Run the established 96-PDF/46-unique baseline check against the pre-download raw layer and verify Git still ignores `/Tmua`. Record counts and commands. No raw PDF appears in `git status` or `git ls-files`.

- [ ] **Step 3: Recheck all twenty source pages visually**

Render pages 3 through 22 at 180 DPI. Compare each page to its question record and update the verification table with a second review timestamp. Check every superscript, fraction, radical, absolute-value symbol, degree symbol, inequality boundary, option label, and diagram label. Any discrepancy becomes a regression test plus corrected content before continuing.

- [ ] **Step 4: Run the local production preview**

Run `pnpm dev --host 127.0.0.1` in a persistent terminal. Open only the exact Local URL printed by Vite. Exercise:

```text
landing -> start -> answer/change/mark -> refresh -> resume
-> navigate all 20 questions -> open/cancel submit -> confirm submit
-> inspect results -> restart
```

Confirm the timer remains deadline-derived after backgrounding and refresh.

- [ ] **Step 5: Inspect representative responsive widths**

Check at least:

- phone: `390 x 844`;
- iPad portrait: `820 x 1180`;
- iPad landscape: `1180 x 820`;
- desktop: `1440 x 1000`.

At every width confirm no horizontal overflow, clipped mathematics, overlapping sticky controls, inaccessible submit action, or touch target below 44 pixels. Confirm reduced-motion behavior and keyboard-only completion of the full journey.

- [ ] **Step 6: Record the release evidence**

Create `docs/content/TMUA_2023_P1_EXPERIENCE_VERIFICATION.md` containing:

- commit SHA;
- Node and pnpm versions;
- dependency, test, type, build, and audit results;
- exact content count and answer-sequence result;
- raw-corpus immutability result;
- the four viewport checks;
- keyboard, focus, contrast, and reduced-motion checks;
- known exclusions: auth, cloud storage, delegated grants, real benchmark, and AI interpretation;
- a statement that the experience is local-preview ready.

- [ ] **Step 7: Verify a second build is stable and commit evidence**

Run `pnpm build` twice and confirm no tracked diff is produced. Then:

```bash
git add docs/content/TMUA_2023_P1_CONTENT_VERIFICATION.md docs/content/TMUA_2023_P1_EXPERIENCE_VERIFICATION.md
git commit -m "docs: verify TMUA 2023 Paper 1 experience"
```

- [ ] **Step 8: Final committed-tree gate**

Run:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
git diff --check main...HEAD
git status --short
```

Expected: every command passes, `git status --short` is empty, the full 20-question experience remains locally runnable, and no raw PDF is tracked.
