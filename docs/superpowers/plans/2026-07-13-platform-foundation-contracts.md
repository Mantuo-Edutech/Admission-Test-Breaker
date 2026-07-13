# Platform Foundation Contracts Implementation Plan

> **Execution:** Implement inline with `superpowers:test-driven-development`; keep every test and architecture gate runnable without application UI or external services.

**Goal:** Establish the learner-owned data, granular authorization, learning-event, AI-job, and module-boundary contracts that the TMUA Reference Journey and future server adapters must share.

**Architecture:** Add framework-free TypeScript modules under `src/platform/`. These modules contain stable domain values and pure policy functions only; they do not import React, browser APIs, databases, model SDKs, or feature pages. The first practice session will consume these contracts while persisting through a local adapter, and a later server repository can keep the same contracts behind PostgreSQL/RLS.

**Tech Stack:** TypeScript 5.9 strict mode, Vitest 4, Node `fs` for independent architecture checks. No new runtime dependencies.

## Global Constraints

- Student learning records always carry a `learnerSpaceId`; a user ID alone is not a tenant boundary.
- Roles never imply data access. Only an active, unexpired, unrevoked `Grant` with the exact scope and matching resource permits a delegated action.
- Owner actions are explicit policy outcomes and remain auditable even though they do not require a Grant.
- Learning events are append-only, ordered within a session, schema-versioned, actor-attributed, and idempotent by event ID.
- The event contract records purposeful learning behavior only; it has no arbitrary analytics payload.
- AI jobs reference approved projections and budgets; they do not embed raw learning history or provider secrets.
- Public content modules cannot import private learner platform modules.
- Platform domain modules cannot import React, browser storage, database clients, or AI provider SDKs.
- Every production behavior is introduced by a focused failing test, then a minimal implementation, then the full gates.

## Target File Structure

```text
src/platform/shared/ids.ts                         branded domain ID types and guards
src/platform/learner-space/domain.ts               LearnerSpace and actor contracts
src/platform/consent/domain.ts                     Grant scopes and pure access decision
src/platform/learning-events/domain.ts             event union and append-only ledger helper
src/platform/ai-gateway/domain.ts                   provider-neutral AI job contract and validator
src/platform/index.ts                              deliberate public platform exports
tests/platform/learner-space/domain.test.ts         ownership and ID invariants
tests/platform/consent/domain.test.ts               exact scope/resource/time/revocation cases
tests/platform/learning-events/domain.test.ts       ordering, actor, and idempotency cases
tests/platform/ai-gateway/domain.test.ts            projection/budget/secret-free validation
tests/architecture/module-boundaries.test.ts        independent forbidden-import scanner
```

---

## Task 1: Learner Space and Domain IDs

**Files:**
- Create: `tests/platform/learner-space/domain.test.ts`
- Create: `src/platform/shared/ids.ts`
- Create: `src/platform/learner-space/domain.ts`

**Contract:**

```ts
type UserId = `usr_${string}`;
type LearnerSpaceId = `lsp_${string}`;

interface LearnerSpace {
  id: LearnerSpaceId;
  ownerUserId: UserId;
  status: "active" | "archived";
  createdAt: string;
}

type ActorRef =
  | { kind: "student" | "teacher" | "parent"; userId: UserId }
  | { kind: "agent" | "system"; actorId: string };

createLearnerSpace(input): LearnerSpace;
```

- [ ] Write tests that accept canonical prefixed IDs and UTC timestamps, reject blank/unprefixed IDs, reject an archived initial space, and expose an explicit owner check.
- [ ] Run `pnpm test -- tests/platform/learner-space/domain.test.ts` and observe module-not-found failure.
- [ ] Implement non-empty prefixed ID assertion helpers, `createLearnerSpace`, and `isLearnerSpaceOwner` without external libraries.
- [ ] Rerun the focused test, `pnpm typecheck`, and all existing tests.
- [ ] Commit: `feat: add learner space domain contract`.

## Task 2: Granular Consent and Grants

**Files:**
- Create: `tests/platform/consent/domain.test.ts`
- Create: `src/platform/consent/domain.ts`

**Contract:**

```ts
type GrantScope =
  | "progress:read"
  | "responses:read"
  | "annotations:write"
  | "plans:write"
  | "assignments:write"
  | "ai-insights:read"
  | "ai-insights:run"
  | "data:export"
  | "integration:operate";

interface Grant {
  id: GrantId;
  learnerSpaceId: LearnerSpaceId;
  grantedByUserId: UserId;
  subject: ActorRef;
  scopes: GrantScope[];
  resource: { kind: "learner-space" } | { kind: "practice-session"; id: PracticeSessionId };
  startsAt: string;
  expiresAt: string;
  revokedAt?: string;
}

decideAccess(request, grants): AccessDecision;
```

- [ ] Write a table-driven policy test for owner access, wrong learner space, missing scope, wrong subject, future grant, expired grant, revoked grant, resource mismatch, and a valid exact grant.
- [ ] Run the test and observe module-not-found failure.
- [ ] Implement pure matching with half-open time validity `[startsAt, expiresAt)`. Return `{ allowed, basis, grantId?, reason }` so callers can audit both permits and denials.
- [ ] Rerun focused, type, and full test gates.
- [ ] Commit: `feat: enforce granular learner grants`.

## Task 3: Learning Event Ledger Contract

**Files:**
- Create: `tests/platform/learning-events/domain.test.ts`
- Create: `src/platform/learning-events/domain.ts`

**Contract:**

```ts
type PracticeLearningEvent =
  | LearningEvent<"session_started", { paperId: string; deadlineAt: string }>
  | LearningEvent<"question_viewed", { questionId: string }>
  | LearningEvent<"answer_selected", { questionId: string; answer: string }>
  | LearningEvent<"answer_changed", { questionId: string; from: string; to: string }>
  | LearningEvent<"question_marked" | "question_unmarked", { questionId: string }>
  | LearningEvent<"submission_opened", { unansweredCount: number }>
  | LearningEvent<"session_submitted" | "session_expired", { answeredCount: number }>
  | LearningEvent<"question_time_recorded", { questionId: string; activeMs: number }>;

appendLearningEvent(currentEvents, draft): AppendResult;
```

- [ ] Write tests that assign sequence one, append consecutive events, return the existing event on a repeated ID, and reject a repeated ID with different content, a different learner space/session, invalid timestamp, or negative active time.
- [ ] Run the test and observe module-not-found failure.
- [ ] Implement a discriminated event validator and pure append helper. Do not accept `Record<string, unknown>` payloads.
- [ ] Rerun focused, type, and full test gates.
- [ ] Commit: `feat: add append-only learning event contract`.

## Task 4: Provider-Neutral AI Job Contract

**Files:**
- Create: `tests/platform/ai-gateway/domain.test.ts`
- Create: `src/platform/ai-gateway/domain.ts`
- Create: `src/platform/index.ts`

**Contract:**

```ts
interface AIJob {
  id: AIRunId;
  purpose: "session_review" | "longitudinal_review" | "teacher_assist";
  learnerSpaceId: LearnerSpaceId;
  requestedBy: ActorRef;
  grantId?: GrantId;
  inputProjectionRefs: readonly ProjectionRef[];
  policyVersion: string;
  budget: { maxInputTokens: number; maxOutputTokens: number; maxCostMinor: number };
}

validateAIJob(job): readonly AIJobValidationIssue[];
```

- [ ] Write tests that require at least one projection, positive integer Token limits, non-negative integer cost, nonblank policy version, a Grant for non-student requesters, and absence of raw prompts/provider keys from the public contract.
- [ ] Run the test and observe module-not-found failure.
- [ ] Implement validation and explicit public exports. Keep provider name/model selection in future adapter configuration, not the job request.
- [ ] Rerun focused, type, and full test gates.
- [ ] Commit: `feat: define auditable AI job contract`.

## Task 5: Executable Architecture Boundary Gate

**Files:**
- Create: `tests/architecture/module-boundaries.test.ts`
- Modify: `package.json`
- Modify: `docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md`

**Rules:**

1. Files below `src/platform/` may not import React, React Router, browser storage modules, database clients, model provider SDKs, or `src/features/**`.
2. Files below `src/content/` and `src/features/practice/content/` may not import `src/platform/learner-space`, `consent`, `learning-events`, or `ai-gateway`.
3. Files below `src/features/practice/domain/` may import platform domain contracts but not React, pages, components, or storage adapters.

- [ ] Write an import scanner that recursively reads `.ts/.tsx`, resolves relative specifiers to repository paths, and reports `file → forbidden import` violations.
- [ ] Add a temporary forbidden fixture inside the test lifecycle, run the scanner, assert that it reports the violation, and remove the fixture in `finally`; also assert the actual source tree is clean.
- [ ] Add scripts `verify:architecture` and `verify` where `verify` runs architecture, all tests, typecheck, and build.
- [ ] Run `pnpm test -- tests/architecture/module-boundaries.test.ts`, `pnpm verify`, and `git diff --check`.
- [ ] Update the roadmap gate from “target” to the exact working command and record the new status baseline.
- [ ] Commit: `test: enforce platform architecture boundaries`.

## Task 6: Rebase the TMUA Reference Journey on Platform Contracts

**Files:**
- Modify: `docs/superpowers/specs/2026-07-13-tmua-2023-paper-1-experience-design.md`
- Modify: `docs/superpowers/plans/2026-07-13-tmua-2023-paper-1-experience.md`

- [ ] Add `learnerSpaceId`, canonical `PracticeSessionId`, `ActorRef`, and `PracticeLearningEvent[]` to the local Reference Journey session contract.
- [ ] State that local storage is an adapter for a learner-owned event document, not a substitute for production tenant isolation.
- [ ] Replace the feature-local event list with the platform learning-event union and add `question_time_recorded` for future projections.
- [ ] Keep the existing Task 3 onward implementation order, but make platform contract tests part of every full gate.
- [ ] Run link/path inspection and `git diff --check`.
- [ ] Commit: `docs: align TMUA journey with platform contracts`.

## Completion Gate

Run from a clean worktree:

```bash
pnpm verify
git status --short
```

Expected: all tests pass, TypeScript has no errors, Vite builds, architecture violations are empty, and only deliberate Reference Journey work remains.
