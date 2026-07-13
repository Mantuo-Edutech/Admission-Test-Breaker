# TMUA 2023 Paper 1 Complete Mock Experience Design

**Status:** Implemented as a local Reference Journey; production privacy gates remain

**Date:** 2026-07-13

**Scope:** Deliver a polished, responsive, locally runnable student experience for the complete 20-question TMUA 2023 Paper 1, including a landing screen, a 75-minute mock session, autosave and recovery, submission, and an honest first results view.

## 1. Purpose

The first product slice must let a nontechnical user experience the project as a real student rather than as a corpus-maintenance repository. It should demonstrate that the product can turn trusted source material into a calm, usable, measurable practice experience without pretending that authentication, cohort benchmarks, or AI interpretation already exist.

This slice optimizes for one complete journey:

```text
Open the product
-> understand the mock and its source
-> begin a 75-minute session
-> answer and review 20 questions
-> submit deliberately
-> inspect score, timing, and answer-level results
```

## 2. Source Material

The mock uses:

- question source: `Tmua/2016-2023paper/tmua-paper-1-2023.pdf`;
- answer source: `Tmua/2016-2023 answer key/tmua-2023.pdf`;
- exam: `TMUA`;
- edition: `2023`;
- paper: `1`;
- question count: `20`;
- duration: `75` minutes.

Every question is manually checked against a rendered source page after extraction. The answer key must contain exactly one valid answer for every question. A question record cannot enter the runnable mock if its prompt, options, mathematical notation, or correct answer remains uncertain.

The raw PDFs remain immutable and uncommitted. The runnable question data is a reviewed derivative with repository-relative provenance references and source page numbers.

## 3. Delivery Boundary

### Included

- complete 20-question Paper 1 content;
- responsive landing screen;
- responsive mock-exam screen;
- 75-minute timer;
- answer selection;
- question navigation;
- mark-for-review state;
- unanswered-state visibility;
- local autosave and recovery;
- explicit submission confirmation;
- results summary and question review;
- local timing and interaction events sufficient for the results view;
- accessibility and reduced-motion support;
- automated content, session, interaction, type, and build verification.

### Excluded

- user registration or authentication;
- cloud persistence or multi-tenant storage;
- teacher or parent authorization;
- real cohort percentile or score prediction;
- AI-generated interpretation or paid reports;
- question-level discussion, comments, or collaboration;
- other TMUA papers or other admission tests;
- public deployment and production analytics.

Excluded features are outside this Reference Journey slice, not outside the full product. They must not be represented as working in this local experience. The interface may describe future capabilities only when clearly marked as unavailable or “sample accumulating.”

## 4. Technical Approach

The existing TypeScript and pnpm repository remains the foundation. The experience is implemented as a React single-page application using:

- Vite for local development and production builds;
- React and React DOM for the interface;
- React Router for landing, session, and results routes;
- Radix UI primitives where a mature accessible behavior is valuable, especially dialogs and progress;
- KaTeX for mathematical notation;
- Lucide icons for consistent interface symbols;
- custom CSS variables and components for the visual system.

The product does not adopt a prebuilt dashboard theme. Mature primitives provide keyboard and accessibility behavior, while layout, typography, color, illustration, and exam interaction remain product-specific.

The initial application is client-side because authentication and server persistence are outside this slice. Storage is hidden behind a `PracticeSessionStore` interface so a later database adapter can replace local storage without changing page components or domain logic. The stored document still uses the platform `LearnerSpaceId`, `PracticeSessionId`, `ActorRef`, and `PracticeLearningEvent` contracts; local storage is an adapter for a learner-owned event document, not a substitute for production tenant isolation.

## 5. Module Boundaries

```text
src/app/
  App.tsx                       route composition
  main.tsx                      browser entry

src/features/practice/
  content/                      reviewed 2023 Paper 1 data
  domain/                       session types, reducer, selectors, timer math
  storage/                      PracticeSessionStore and local adapter
  components/                   question, navigation, timer, dialogs
  pages/                        landing, mock session, result review

src/styles/
  tokens.css                    brand and responsive tokens
  global.css                    reset, typography, shared surfaces
  practice.css                  product-specific responsive layouts
```

Domain code does not import React, browser storage, or page components. Page components depend on domain interfaces, not on local-storage implementation details. This keeps session behavior independently testable and prepares the slice for future server persistence.

## 6. Routes and Screens

### 6.1 Landing: `/`

The first viewport communicates one action, not a generic dashboard.

- Full product wordmark treatment using the Mantou `M` mark and the public-interest TMUA practice identity.
- Headline: “把焦虑，拆成每一道题。”
- Supporting copy explains that this is the complete TMUA 2023 Paper 1, 20 questions, 75 minutes, no calculator.
- Primary action starts a new mock.
- When a recoverable local session exists, a separate “继续上次练习” action shows answered count and remaining time.
- A restrained academic illustration combines an arch, desk lamp, books, graph paper, and geometric construction lines. It is decorative and hidden from assistive technology.
- A compact trust strip states the source year, paper, verification status, and local-only data behavior.

### 6.2 Mock session: `/practice/tmua-2023-paper-1`

The exam page prioritizes the current question.

- Sticky header: product mark, `TMUA 2023 · Paper 1`, answered progress, remaining time, and submit action.
- Main question surface: question number, optional topic label, source-safe mathematical prompt, and large answer choices.
- Answer choices use native radio semantics, a minimum 44-pixel touch target, visible keyboard focus, and single-letter shortcuts when focus is not inside another control.
- Navigation controls: previous, next, and mark/unmark for review.
- Question map states: current, answered, unanswered, marked, and answered+marked.
- The answer and explanation are never shown before submission.

Desktop uses a two-column layout with a persistent question map. iPad uses a narrower persistent rail in landscape and a collapsible map in portrait. Mobile uses a single-column question surface with a bottom action bar and a Radix dialog/drawer-style question map.

### 6.3 Submission dialog

Submission is never accidental.

- Shows answered, unanswered, and marked counts.
- If unanswered questions exist, the primary copy names the count without blocking submission.
- “返回检查” closes the dialog and moves focus back safely.
- “确认提交” finalizes the session, calculates results once, and navigates to the result route.
- Timer expiry triggers the same finalization path with an explicit “时间到” reason.

### 6.4 Results: `/results/:sessionId`

The result page reports only evidence available from this session.

- score out of 20 and percentage;
- total active time and average recorded time per question;
- correct, incorrect, and unanswered counts;
- timing signals such as longest questions and unusually fast answers;
- topic-level summary where reviewed question tags exist;
- an answer-review list with selected answer, correct answer, time spent, and marked state;
- a clear label that population benchmark data is still accumulating;
- actions to review mistakes and restart the mock.

No percentile, predicted TMUA score, or readiness estimate is fabricated.

## 7. Visual System

The visual direction is warm academic illustration: quiet, detailed, and confident rather than childish or institutional.

Core palette derived from the supplied Mantou logo:

- Mantou purple: approximately `#63528C`;
- deep ink: `#282332`;
- slate grey: `#76777A`;
- warm paper: `#F7F1E7`;
- raised paper: `#FFFDF8`;
- muted lavender: `#EAE4F2`;
- success: `#3F725A`;
- warning: `#A66A36`;
- error: `#A64D4D`.

Typography combines an editorial serif for large headings and mathematical atmosphere with a highly legible sans serif for interface controls and body text. System-safe fallbacks are required. Mathematical expressions use KaTeX rather than approximated Unicode.

Borders are thin and ink-like. Shadows are soft and warm. Corners are modest rather than pill-heavy. Decorative lines and textures must never reduce contrast or compete with question content.

Motion is limited to short state transitions and is disabled or reduced when `prefers-reduced-motion` is active.

## 8. Question Data Contract

Each runnable question contains:

```ts
interface PracticeQuestion {
  id: `tmua-2023-p1-q${string}`;
  number: number;
  sourcePage: number;
  prompt: QuestionBlock[];
  options: Array<{ label: string; content: QuestionBlock[] }>;
  correctAnswer: string;
  knowledgeTags: string[];
  skillTags: string[];
  reviewStatus: "verified";
  sourceQuestionPath: string;
  sourceAnswerPath: string;
}
```

`QuestionBlock` supports paragraphs, display mathematics, inline mathematics, lists, and reviewed figure assets. Raw HTML is not accepted. This avoids unsafe rendering and makes mathematical and accessible output explicit.

The content validator blocks the build when:

- there are not exactly 20 questions;
- question numbers or IDs are duplicated;
- numbers are not exactly 1 through 20;
- an option label is duplicated within a question;
- a correct answer does not refer to an existing option;
- a question is not verified;
- a provenance path is absolute;
- required prompt or option content is empty.

## 9. Session and Event Model

The browser stores one versioned session document:

```ts
interface PracticeSession {
  schemaVersion: 1;
  id: PracticeSessionId;
  learnerSpaceId: LearnerSpaceId;
  startedBy: ActorRef;
  paperId: "tmua-2023-p1";
  status: "active" | "submitted" | "expired";
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
  currentQuestion: number;
  answers: Record<string, string>;
  markedQuestionIds: string[];
  timingByQuestionMs: Record<string, number>;
  events: PracticeLearningEvent[];
}
```

`PracticeLearningEvent` is imported from the platform event ledger contract. Every event carries its own stable ID, schema version, learner space, session, actor, occurrence time, and consecutive session sequence. The feature reducer may create event drafts, but it cannot define a parallel feature-local event format.

The first event set records only purposeful learning behavior:

- `session_started`;
- `question_viewed`;
- `answer_selected`;
- `answer_changed`;
- `question_marked`;
- `question_unmarked`;
- `submission_opened`;
- `session_submitted`;
- `session_expired`.
- `question_time_recorded`.

Events contain the learner space, session ID, actor, question ID where applicable, event time, and typed purposeful payload. They do not collect device fingerprinting, free-form keystrokes, browsing history, or unrelated behavioral surveillance.

## 10. Timer, Autosave, and Recovery

Remaining time is derived from `deadlineAt - now`, never by trusting a decrementing in-memory counter. This prevents drift during background tabs, sleep, or refresh.

Session state is saved after every meaningful transition through a debounced local adapter, with an immediate flush for answer selection, submission, and page visibility changes. Invalid or incompatible stored data is quarantined and replaced only after the user is told the session cannot be recovered.

Reloading an active session restores the current question, answers, marked state, timing totals, and deadline. A submitted session cannot return to active state. Finalization is idempotent so double-clicks or repeated timer callbacks cannot create conflicting results.

## 11. Error Handling

- Missing or invalid question content prevents application build rather than creating an incomplete live mock.
- Storage failure keeps the current in-memory session usable and shows a non-blocking warning that recovery may be unavailable.
- An invalid stored session is not silently trusted.
- A missing result session routes to a calm recovery state with actions to return home or start again.
- Formula rendering failure falls back to the original TeX source in readable text and produces a development warning.
- No error exposes an absolute file path or raw stack trace in the student interface.

## 12. Accessibility

- Semantic landmarks and headings describe the page structure.
- Native form controls or Radix primitives preserve keyboard behavior.
- Focus is visible and restored after dialogs.
- Question status is conveyed by text or icon as well as color.
- Touch targets are at least 44 by 44 pixels.
- Contrast meets WCAG 2.1 AA for body text and controls.
- Timer updates do not create continuous screen-reader announcements; warnings are announced only at meaningful thresholds.
- Decorative academic illustration has empty alternative text or is CSS-only.

## 13. Verification Strategy

Development follows test-driven implementation.

### Content tests

- exactly 20 verified questions;
- stable IDs and contiguous numbers;
- correct answers reference valid options;
- source paths are safe and repository-relative;
- expected 2023 Paper 1 answer sequence matches the reviewed answer key.

### Domain tests

- starting, answering, changing, marking, navigating, and submitting;
- idempotent finalization;
- expiry based on deadline;
- timing accumulation when question focus changes;
- result calculation for correct, incorrect, and unanswered questions;
- serialization, migration rejection, and recovery.
- platform event sequence, idempotency, actor attribution, and learner-space isolation.

### Component tests

- keyboard and touch answer selection;
- question navigation and status rendering;
- submission dialog counts;
- answer hiding before submission;
- result visibility after submission.

### Release checks

```text
pnpm install --frozen-lockfile
pnpm verify
```

The final review also checks the landing, session, submission, and result screens at representative mobile, tablet, and desktop widths. All 20 questions are compared with rendered source pages, with special attention to formulae, radicals, inequalities, diagrams, and option labels.

## 14. Acceptance Criteria

The slice is complete when:

1. a user can open the local site and start the complete 2023 Paper 1 mock;
2. all 20 questions and correct answers have verified source provenance;
3. the mock works at phone, iPad, and desktop widths without losing functionality;
4. refreshing an active mock restores answers and remaining time;
5. answers remain hidden before deliberate submission or expiry;
6. results are calculated deterministically from the reviewed answer key;
7. no fabricated benchmark or AI interpretation is shown;
8. tests, strict typechecking, and the production build pass;
9. the existing raw TMUA PDFs remain unchanged;
10. the implementation uses platform learner/event contracts while remaining separable from future authentication and server persistence.

## 15. Follow-on Work

After this slice is validated, the same interfaces can support:

- additional TMUA papers;
- authenticated cloud sessions;
- authenticated PostgreSQL/RLS storage for the existing student-owned event contract;
- granular teacher, parent, and agent grants;
- cohort-qualified benchmark snapshots;
- AI interpretation through a configurable gateway;
- paid reports without charging for the underlying practice experience.

Those extensions require their own reviewed data, privacy, authorization, and commercial contracts and are not implicit in this implementation.
