# TMUA Evidence-Safe Guest Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the evidence-safe local foundation for the approved TMUA preparation loop: trustworthy active-time recording, a real local Guest Space, and a progressive CAIE/Pearson preparation profile shown before personalized TMUA preparation.

**Architecture:** Keep the existing API-first modular-monolith boundaries. Correct timing in the pure practice domain, introduce a framework-free Guest Space alongside authenticated Learner Space, persist guest/profile data through versioned local adapters, and integrate a focused profile panel into the current TMUA hub. This plan intentionally stops before knowledge coverage calculation, the 5-question preview, the 8-question diagnostic, production authentication/RLS, Benchmark, and AI execution; each remains a separate working-software plan.

**Tech Stack:** Node.js 22+, TypeScript 5.9 strict mode, React 19, React Router 7, Vitest 4, Testing Library, Radix primitives already installed, YAML 2, CSS design tokens, browser `visibilitychange`/`pagehide`, localStorage reference adapters.

## Global Constraints

- The slogan remains exactly `不再为升学考试而焦虑`.
- TMUA, ESAT, TARA, and UCAT remain equal-level platform entrances; this plan changes only the TMUA preparation space.
- Public browsing remains possible without registration or profile completion.
- The profile collects exact curriculum system, qualification, unit/module, entry cycle, and prior preparation experience; it does not infer readiness.
- Course coverage and real readiness remain separate; this plan displays only honest pending states and does not calculate either score.
- AI, Token, paid interpretation, and Mantou service calls do not appear in the profile or primary TMUA journey.
- A Guest Space is local-only, is not an authenticated Learner Space, cannot receive delegated grants, and must be explicitly claimable by a later account flow.
- Question time means visible active-page time, not elapsed wall-clock time or proven cognitive thinking time.
- A 75-minute paper can never accumulate more than 75 minutes total active question time.
- Raw files under `Tmua/` and binary files under `research/official-sources/files/` remain immutable and uncommitted.
- Preserve the existing unstaged `.gitignore`, `README.md`, and `research/` changes; do not stage them in any task commit.
- Every task uses a failing test first, a focused passing test second, then `pnpm verify` at the task gate.

## Target File Map

```text
src/platform/shared/ids.ts
src/platform/learning-space/domain.ts                    new Guest/Learner space-neutral actor contract
src/platform/learner-space/domain.ts                     authenticated Learner Space only
src/platform/learning-events/domain.ts                   learningSpaceId + pause/resume events
src/platform/consent/domain.ts                           authenticated grants remain Learner Space-only
src/platform/ai-gateway/domain.ts                        reject Guest actors at the AI boundary
src/platform/index.ts

src/features/practice/domain/session.ts                  schema v2 and nullable active segment
src/features/practice/domain/reducer.ts                  capped active-segment accounting
src/features/practice/pages/PracticePage.tsx             visibility lifecycle
src/features/practice/pages/ResultsPage.tsx              honest time copy; no premature AI promotion
src/features/practice/storage/local-store.ts             v2 parser; v1 quarantine

src/features/guest-space/storage/store.ts                GuestSpaceStore interface
src/features/guest-space/storage/local-store.ts          versioned local Guest Space adapter

src/features/preparation-profile/catalog.ts              approved CAIE/Pearson qualifications and units
src/features/preparation-profile/domain.ts               validated progressive profile
src/features/preparation-profile/storage/store.ts        profile adapter interface
src/features/preparation-profile/storage/local-store.ts  versioned local profile adapter
src/features/preparation-profile/components/ProfilePanel.tsx

src/app/dependencies.ts                                  inject guest/profile/session stores
src/app/local-demo.ts                                    delete after migration
src/features/catalog/pages/TmuaHubPage.tsx               profile-first TMUA hub integration
src/styles/practice.css                                  responsive branded profile panel

verification/features/tmua-evidence-safe-guest-profile.yaml
tests/architecture/feature-manifests.test.ts
```

---

### Task 1: Make Question Timing Evidence-Safe

**Files:**
- Modify: `src/platform/learning-events/domain.ts`
- Modify: `src/features/practice/domain/session.ts`
- Modify: `src/features/practice/domain/reducer.ts`
- Modify: `src/features/practice/pages/PracticePage.tsx`
- Modify: `src/features/practice/pages/ResultsPage.tsx`
- Modify: `tests/platform/learning-events/domain.test.ts`
- Modify: `tests/features/practice/domain/session.test.ts`
- Modify: `tests/app/practice-page.test.tsx`
- Modify: `tests/app/results-page.test.tsx`

**Interfaces:**
- Consumes: existing `PracticeSession`, `PracticeLearningEvent`, `practiceSessionReducer`.
- Produces: nullable `activeQuestionEnteredAt`, `pause`/`resume` actions, capped `question_time_recorded`, and result copy that says visible active-page time.

- [ ] **Step 1: Write failing domain tests for deadline capping and inactive gaps**

Add these cases to `tests/features/practice/domain/session.test.ts`:

```ts
it("caps active question time at the paper deadline when expiry is detected late", () => {
  const expired = practiceSessionReducer(createStartedSession(), {
    type: "expire",
    eventId: "evt_expired-late",
    timeEventId: "evt_time-late",
    at: "2026-07-13T02:00:00.000Z",
  });

  expect(expired.timingByQuestionMs["tmua-2023-p1-q01"]).toBe(75 * 60_000);
  expect(expired.events.at(-2)).toMatchObject({
    type: "question_time_recorded",
    payload: { questionId: "tmua-2023-p1-q01", activeMs: 75 * 60_000 },
  });
});

it("excludes a hidden-page interval from active question time", () => {
  const paused = practiceSessionReducer(createStartedSession(), {
    type: "pause",
    eventId: "evt_paused",
    timeEventId: "evt_time-before-pause",
    at: "2026-07-13T00:05:00.000Z",
    reason: "visibility_hidden",
  });
  const resumed = practiceSessionReducer(paused, {
    type: "resume",
    eventId: "evt_resumed",
    at: "2026-07-13T00:15:00.000Z",
    reason: "visibility_visible",
  });
  const submitted = practiceSessionReducer(resumed, {
    type: "submit",
    eventId: "evt_submit-after-resume",
    timeEventId: "evt_time-after-resume",
    at: "2026-07-13T00:20:00.000Z",
    reason: "student",
  });

  expect(submitted.timingByQuestionMs["tmua-2023-p1-q01"]).toBe(10 * 60_000);
  expect(submitted.events.map((event) => event.type)).toContain("session_paused");
  expect(submitted.events.map((event) => event.type)).toContain("session_resumed");
});
```

- [ ] **Step 2: Run the focused domain tests and verify the new action types fail**

Run:

```bash
pnpm exec vitest run tests/features/practice/domain/session.test.ts
```

Expected: TypeScript/test failure because `pause`, `resume`, `session_paused`, and `session_resumed` are not defined; the late-expiry case also exposes 120 minutes instead of 75.

- [ ] **Step 3: Extend the event contract with exact lifecycle events**

Add to `src/platform/learning-events/domain.ts`:

```ts
type SessionPausePayload = {
  reason: "visibility_hidden" | "pagehide";
};
type SessionResumePayload = {
  reason: "visibility_visible";
};

export type PracticeLearningEvent =
  | LearningEvent<"session_started", SessionStartedPayload>
  | LearningEvent<"session_paused", SessionPausePayload>
  | LearningEvent<"session_resumed", SessionResumePayload>
  | LearningEvent<"question_viewed", QuestionPayload>
  | LearningEvent<"answer_selected", AnswerSelectedPayload>
  | LearningEvent<"answer_changed", AnswerChangedPayload>
  | LearningEvent<"question_marked", QuestionPayload>
  | LearningEvent<"question_unmarked", QuestionPayload>
  | LearningEvent<"submission_opened", SubmissionOpenedPayload>
  | LearningEvent<"session_submitted", SubmissionPayload>
  | LearningEvent<"session_expired", SubmissionPayload>
  | LearningEvent<"question_time_recorded", QuestionTimePayload>;
```

Update `assertPurposefulPayload` so pause/resume payloads accept exactly `reason` and reject every other field. Mirror the same cases in `PracticeLearningEventDraft`.

- [ ] **Step 4: Implement nullable active segments and deadline capping**

Change `PracticeSession.activeQuestionEnteredAt` to `string | null`. Replace the timing helper in `src/features/practice/domain/reducer.ts` with:

```ts
function recordActiveQuestionTime(
  session: PracticeSession,
  eventId: LearningEventId,
  at: string,
): PracticeSession {
  if (session.activeQuestionEnteredAt === null) {
    return session;
  }

  const questionId = questionIdForNumber(session.currentQuestion);
  const segmentStart = Date.parse(session.activeQuestionEnteredAt);
  const segmentEnd = Math.min(Date.parse(at), Date.parse(session.deadlineAt));
  const activeMs = Math.max(0, segmentEnd - segmentStart);
  const accumulated = session.timingByQuestionMs[questionId] ?? 0;
  const withoutActiveSegment = {
    ...session,
    activeQuestionEnteredAt: null,
    timingByQuestionMs: {
      ...session.timingByQuestionMs,
      [questionId]: accumulated + activeMs,
    },
  };

  if (activeMs === 0) {
    return withoutActiveSegment;
  }

  return appendEvent(withoutActiveSegment, {
    id: eventId,
    learnerSpaceId: session.learnerSpaceId,
    sessionId: session.id,
    type: "question_time_recorded",
    actor: session.startedBy,
    occurredAt: at,
    payload: { questionId, activeMs },
  });
}
```

Add `pause` and `resume` reducer actions. `pause` records the active segment and appends `session_paused`; repeated pause while already inactive returns the same session. `resume` sets `activeQuestionEnteredAt` only when `Date.parse(at) < Date.parse(deadlineAt)` and appends `session_resumed`; repeated resume while already active returns the same session. `viewQuestion` sets the new question's `activeQuestionEnteredAt` to `action.at` after recording the previous segment.

Task 1 intentionally uses the current `learnerSpaceId` field in event snippets. Task 2 performs the single mechanical migration to `learningSpaceId`; do not mix that schema migration into the timing-fix commit.

The reducer action union adds exactly:

```ts
| {
    type: "pause";
    eventId: LearningEventId;
    timeEventId: LearningEventId;
    at: string;
    reason: "visibility_hidden" | "pagehide";
  }
| {
    type: "resume";
    eventId: LearningEventId;
    at: string;
    reason: "visibility_visible";
  }
```

- [ ] **Step 5: Add browser visibility lifecycle handling**

Import `useCallback`. Replace the current `updateSession` declaration with a stable callback so lifecycle listeners and button handlers share one persistence path:

```ts
const updateSession = useCallback(
  (transform: (current: PracticeSession) => PracticeSession) => {
    setLoadState((current) => {
      if (current.kind !== "ready") return current;
      const next = transform(current.session);
      if (next === current.session) return current;
      void services.store.save(next).then((result) => {
        if (!result.persisted) setPersistenceWarning(true);
      });
      return { kind: "ready", session: next };
    });
  },
  [services.store],
);
```

Add one effect that uses that callback:

```ts
useEffect(() => {
  function pause(reason: "visibility_hidden" | "pagehide") {
    updateSession((current) =>
      practiceSessionReducer(current, {
        type: "pause",
        eventId: services.ids.eventId(),
        timeEventId: services.ids.eventId(),
        at: services.now().toISOString(),
        reason,
      }),
    );
  }

  function resume() {
    updateSession((current) =>
      practiceSessionReducer(current, {
        type: "resume",
        eventId: services.ids.eventId(),
        at: services.now().toISOString(),
        reason: "visibility_visible",
      }),
    );
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      pause("visibility_hidden");
    } else {
      resume();
    }
  }

  function onPageHide() {
    pause("pagehide");
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  globalThis.addEventListener("pagehide", onPageHide);
  onVisibilityChange();
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    globalThis.removeEventListener("pagehide", onPageHide);
  };
}, [services.ids, services.now, session?.id, updateSession]);
```

Calling `onVisibilityChange()` once during setup ensures a session loaded into an already-hidden tab is paused immediately. Add an app-level lifecycle test. Import `afterEach` and `vi`, register `afterEach(() => vi.restoreAllMocks())`, mock the `document.visibilityState` getter, and dispatch `visibilitychange`:

```ts
it("pauses timing while the page is hidden and resumes when visible", async () => {
  const store = new PracticeStore(activeSession());
  const visibility = vi.spyOn(document, "visibilityState", "get");
  const router = createAppRouter(
    ["/practice/tmua-2023-paper-1"],
    appServices(store),
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "第 1 题" });

  visibility.mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  await waitFor(() => {
    expect(store.saves.at(-1)?.activeQuestionEnteredAt).toBeNull();
    expect(store.saves.at(-1)?.events.at(-1)?.type).toBe("session_paused");
  });

  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  await waitFor(() => {
    expect(store.saves.at(-1)?.activeQuestionEnteredAt).not.toBeNull();
    expect(store.saves.at(-1)?.events.at(-1)?.type).toBe("session_resumed");
  });
});
```

- [ ] **Step 6: Make result copy match the evidence**

In `ResultsPage.tsx`:

- rename `记录用时` to `活跃页内用时`;
- change the rhythm explanation to `仅统计页面可见且练习处于活动状态的时间`;
- remove the entire `future-interpretation` section;
- keep the fair Benchmark insufficient-sample section;
- keep the return/restart action.

Add an assertion to `tests/app/results-page.test.tsx`:

```ts
expect(screen.getByText("活跃页内用时")).toBeInTheDocument();
expect(screen.queryByText(/AI 深度解读/)).not.toBeInTheDocument();
```

- [ ] **Step 7: Run focused and complete verification**

Run:

```bash
pnpm exec vitest run tests/platform/learning-events/domain.test.ts tests/features/practice/domain/session.test.ts tests/app/practice-page.test.tsx tests/app/results-page.test.tsx
pnpm verify
```

Expected: all focused tests pass; complete verification reports zero architecture/content failures, all Vitest files pass, TypeScript succeeds, and Vite builds.

- [ ] **Step 8: Commit the timing correction only**

```bash
git add src/platform/learning-events/domain.ts src/features/practice/domain/session.ts src/features/practice/domain/reducer.ts src/features/practice/pages/PracticePage.tsx src/features/practice/pages/ResultsPage.tsx tests/platform/learning-events/domain.test.ts tests/features/practice/domain/session.test.ts tests/app/practice-page.test.tsx tests/app/results-page.test.tsx
git commit -m "fix: make practice timing evidence-safe"
```

---

### Task 2: Add a Real Local Guest Space Contract

**Files:**
- Create: `src/platform/learning-space/domain.ts`
- Create: `tests/platform/learning-space/domain.test.ts`
- Modify: `src/platform/shared/ids.ts`
- Modify: `src/platform/learner-space/domain.ts`
- Modify: `src/platform/learning-events/domain.ts`
- Modify: `src/platform/consent/domain.ts`
- Modify: `src/platform/ai-gateway/domain.ts`
- Modify: `src/platform/index.ts`
- Modify: `src/features/practice/domain/session.ts`
- Modify: `src/features/practice/domain/reducer.ts`
- Modify: `src/features/practice/storage/local-store.ts`
- Modify: all affected platform/practice tests

**Interfaces:**
- Consumes: authenticated `LearnerSpace`, existing actor and event contracts.
- Produces: `GuestSpaceId`, `LearningSpaceId`, `GuestSpace`, Guest-aware `ActorRef`, and `learningSpaceId` on events/sessions.

- [ ] **Step 1: Write failing Guest Space ownership and boundary tests**

Create `tests/platform/learning-space/domain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createGuestSpace,
  isGuestSpaceOwner,
} from "../../../src/platform/learning-space/domain.js";

describe("local guest space", () => {
  it("creates an unclaimed local space owned by one guest actor", () => {
    const space = createGuestSpace({
      id: "gsp_browser-one",
      ownerActorId: "guest_browser-one",
      createdAt: "2026-07-14T00:00:00.000Z",
    });

    expect(space).toEqual({
      id: "gsp_browser-one",
      ownerActorId: "guest_browser-one",
      status: "unclaimed",
      createdAt: "2026-07-14T00:00:00.000Z",
    });
    expect(isGuestSpaceOwner(space, { kind: "guest", actorId: "guest_browser-one" })).toBe(true);
    expect(isGuestSpaceOwner(space, { kind: "guest", actorId: "guest_other" })).toBe(false);
  });

  it("rejects learner-space and guest-space IDs used in the wrong domain", () => {
    expect(() => createGuestSpace({
      id: "lsp_wrong",
      ownerActorId: "guest_browser-one",
      createdAt: "2026-07-14T00:00:00.000Z",
    })).toThrow(/gsp_/);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

```bash
pnpm exec vitest run tests/platform/learning-space/domain.test.ts
```

Expected: FAIL because `learning-space/domain.ts` and Guest ID guards do not exist.

- [ ] **Step 3: Add exact Guest and learning-space-neutral types**

In `src/platform/shared/ids.ts` add:

```ts
export type GuestSpaceId = `gsp_${string}`;
export type LearningSpaceId = LearnerSpaceId | GuestSpaceId;

export function asGuestSpaceId(value: string): GuestSpaceId {
  return asPrefixedId(value, "gsp_", "Guest space ID");
}

export function asLearningSpaceId(value: string): LearningSpaceId {
  if (value.startsWith("lsp_")) return asLearnerSpaceId(value);
  return asGuestSpaceId(value);
}
```

Create `src/platform/learning-space/domain.ts`:

```ts
import {
  asGuestSpaceId,
  assertCanonicalUtcTimestamp,
  type GuestSpaceId,
  type UserId,
} from "../shared/ids.js";

export type ActorRef =
  | { kind: "guest"; actorId: string }
  | { kind: "student" | "teacher" | "parent"; userId: UserId }
  | { kind: "agent" | "system"; actorId: string };

export interface GuestSpace {
  id: GuestSpaceId;
  ownerActorId: string;
  status: "unclaimed";
  createdAt: string;
}

export function createGuestSpace(input: {
  id: string;
  ownerActorId: string;
  createdAt: string;
}): GuestSpace {
  if (!input.ownerActorId.startsWith("guest_") || input.ownerActorId.length === 6) {
    throw new Error("Guest actor ID must start with guest_ and contain a value");
  }
  assertCanonicalUtcTimestamp(input.createdAt, "Guest space createdAt");
  return {
    id: asGuestSpaceId(input.id),
    ownerActorId: input.ownerActorId,
    status: "unclaimed",
    createdAt: input.createdAt,
  };
}

export function isGuestSpaceOwner(space: GuestSpace, actor: ActorRef): boolean {
  return actor.kind === "guest" && actor.actorId === space.ownerActorId;
}
```

Move `ActorRef` imports from `learner-space/domain.ts` to the new module. `LearnerSpace` remains authenticated and continues to use `LearnerSpaceId` and `UserId` only.

- [ ] **Step 4: Rename event/session ownership to `learningSpaceId`**

Change `LearningEvent` and `LearningEventDraft` from `learnerSpaceId: LearnerSpaceId` to:

```ts
learningSpaceId: LearningSpaceId;
```

Change `PracticeSession` and `CreatePracticeSessionInput` to the same field. Update the append validator so every event in a session must share both `learningSpaceId` and `sessionId`. Update all event creation and test fixtures mechanically; do not retain both field names.

Increment the practice session to `schemaVersion: 2`. The local-store parser accepts only schema version 2 after Task 2; version 1 returns `unsupported` and is quarantined rather than silently assigned to a Guest Space.

- [ ] **Step 5: Keep grants and AI on authenticated spaces**

`Consent.AccessRequest` continues to accept `LearnerSpace`, never `GuestSpace`. Import `ActorRef` from `learning-space/domain.ts`, but add an early denial for a Guest actor:

```ts
if (request.actor.kind === "guest") {
  return denial("no_matching_grant");
}
```

In `validateAIJob`, add an `invalid_requester` issue for `requestedBy.kind === "guest"`. A guest may practice locally, but cannot run paid/server AI until a later explicit account-claim flow creates an authenticated Learner Space.

- [ ] **Step 6: Run migration-focused tests and the complete gate**

```bash
pnpm exec vitest run tests/platform tests/features/practice/domain tests/features/practice/storage
pnpm verify
```

Expected: every platform and practice test uses `learningSpaceId`; schema-v1 local sessions are classified `unsupported`; no architecture violations exist.

- [ ] **Step 7: Commit the Guest Space domain migration**

```bash
git add src/platform src/features/practice/domain src/features/practice/storage tests/platform tests/features/practice/domain tests/features/practice/storage
git commit -m "feat: add local guest space semantics"
```

---

### Task 3: Persist One Stable Guest Workspace Per Browser

**Files:**
- Create: `src/features/guest-space/storage/store.ts`
- Create: `src/features/guest-space/storage/local-store.ts`
- Create: `tests/features/guest-space/storage/local-store.test.ts`
- Modify: `src/app/dependencies.ts`
- Delete: `src/app/local-demo.ts`
- Modify: `src/features/catalog/pages/TmuaHubPage.tsx`
- Modify: `tests/app/tmua-hub-page.test.tsx`

**Interfaces:**
- Consumes: `createGuestSpace`, `GuestSpace`, `PracticeSessionStore`.
- Produces: `GuestSpaceStore.loadOrCreate()` and AppServices-injected stable guest identity.

- [ ] **Step 1: Write failing adapter tests**

Create `tests/features/guest-space/storage/local-store.test.ts` with an in-memory `Storage` double and these expectations:

```ts
it("returns the same guest space across repeated loads", async () => {
  const storage = new MemoryStorage();
  const store = new LocalGuestSpaceStore(
    storage,
    () => new Date("2026-07-14T00:00:00.000Z"),
    () => "browser-one",
  );

  const first = await store.loadOrCreate();
  const second = await store.loadOrCreate();

  expect(first).toEqual(second);
  expect(first.id).toBe("gsp_browser-one");
  expect(first.ownerActorId).toBe("guest_browser-one");
});

it("quarantines malformed guest data before creating a replacement", async () => {
  const storage = new MemoryStorage();
  storage.setItem("admission-breaker:guest-space:v1", "{bad json");
  const store = new LocalGuestSpaceStore(
    storage,
    () => new Date("2026-07-14T00:00:00.000Z"),
    () => "replacement",
  );

  expect((await store.loadOrCreate()).id).toBe("gsp_replacement");
  expect(storage.keys().some((key) => key.startsWith("admission-breaker:guest-space:corrupt:"))).toBe(true);
});
```

- [ ] **Step 2: Run the adapter test and observe module-not-found failure**

```bash
pnpm exec vitest run tests/features/guest-space/storage/local-store.test.ts
```

Expected: FAIL because the Guest Space adapter is absent.

- [ ] **Step 3: Implement the store contract and strict versioned parser**

Create `src/features/guest-space/storage/store.ts`:

```ts
import type { GuestSpace } from "../../../platform/learning-space/domain.js";

export interface GuestSpaceStore {
  loadOrCreate(): Promise<GuestSpace>;
}
```

`LocalGuestSpaceStore` uses key `admission-breaker:guest-space:v1`, accepts exactly `id`, `ownerActorId`, `status`, and `createdAt`, requires `status === "unclaimed"`, validates the other fields through `createGuestSpace`, and quarantines malformed data under `admission-breaker:guest-space:corrupt:<UTC timestamp>`. It creates both IDs from one injected suffix: `gsp_${suffix}` and `guest_${suffix}`. Claiming is deliberately absent from this local adapter; the later authenticated account flow must atomically import the data and remove this Guest Space.

- [ ] **Step 4: Inject the Guest Space store and remove the fake student**

Extend `AppServices`:

```ts
export interface AppServices {
  store: PracticeSessionStore;
  guestSpaceStore: GuestSpaceStore;
  now(): Date;
  ids: AppIdFactory;
}
```

`createDefaultAppServices()` constructs `LocalGuestSpaceStore` with `globalThis.localStorage`, the same `now`, and `randomSuffix`. Delete `src/app/local-demo.ts`.

In `TmuaHubPage.startSession()`, load the Guest Space and create the session with:

```ts
const guestSpace = await services.guestSpaceStore.loadOrCreate();
const session = createPracticeSession({
  id: services.ids.sessionId(),
  learningSpaceId: guestSpace.id,
  actor: { kind: "guest", actorId: guestSpace.ownerActorId },
  startedAt: services.now().toISOString(),
  eventId: services.ids.eventId(),
});
```

- [ ] **Step 5: Update injected test services and verify ownership**

Add a `FixedGuestSpaceStore` to app tests. In `tmua-hub-page.test.tsx`, assert the saved session has:

```ts
expect(store.saved).toMatchObject({
  learningSpaceId: "gsp_tmua-hub-test",
  startedBy: { kind: "guest", actorId: "guest_tmua-hub-test" },
  status: "active",
});
```

- [ ] **Step 6: Run focused and complete verification**

```bash
pnpm exec vitest run tests/features/guest-space tests/app/tmua-hub-page.test.tsx
pnpm verify
```

Expected: stable Guest Space tests pass; a new paper session belongs to the local Guest Space; all previous gates remain green.

- [ ] **Step 7: Commit the local Guest Workspace adapter**

```bash
git add src/features/guest-space src/app/dependencies.ts src/app/local-demo.ts src/features/catalog/pages/TmuaHubPage.tsx tests/features/guest-space tests/app/tmua-hub-page.test.tsx
git commit -m "feat: persist a local guest workspace"
```

---

### Task 4: Define the Exact CAIE and Pearson Preparation Profile

**Files:**
- Create: `src/features/preparation-profile/catalog.ts`
- Create: `src/features/preparation-profile/domain.ts`
- Create: `src/features/preparation-profile/storage/store.ts`
- Create: `src/features/preparation-profile/storage/local-store.ts`
- Create: `tests/features/preparation-profile/catalog.test.ts`
- Create: `tests/features/preparation-profile/domain.test.ts`
- Create: `tests/features/preparation-profile/storage/local-store.test.ts`

**Interfaces:**
- Consumes: `GuestSpaceId`, official-source versions recorded in `research/official-sources/sources.json`.
- Produces: `PREPARATION_CATALOG`, `PreparationProfile`, `createPreparationProfile`, and `PreparationProfileStore`.

- [ ] **Step 1: Write failing catalog and validation tests**

The tests require these four exact initial qualifications and units:

```ts
expect(PREPARATION_CATALOG.map((item) => item.id)).toEqual([
  "caie-9709-2026-2027",
  "caie-9231-2026-2027",
  "pearson-ial-mathematics-issue-3",
  "pearson-ial-further-mathematics-issue-3",
]);

expect(
  PREPARATION_CATALOG.find((item) => item.id === "caie-9709-2026-2027")?.units.map((unit) => unit.id),
).toEqual(["p1", "p2", "p3", "m1", "s1", "s2"]);

expect(() => createPreparationProfile({
  guestSpaceId: "gsp_profile-one",
  exam: "TMUA",
  entryCycle: "2027",
  curriculumSystem: "caie",
  qualificationIds: ["caie-9709-2026-2027"],
  unitIds: [],
  experience: "sampled",
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
})).toThrow(/unit/);
```

- [ ] **Step 2: Run tests and verify missing modules**

```bash
pnpm exec vitest run tests/features/preparation-profile/catalog.test.ts tests/features/preparation-profile/domain.test.ts
```

Expected: FAIL because catalog and profile contracts do not exist.

- [ ] **Step 3: Implement the catalog with explicit source revisions**

Use this contract in `catalog.ts`:

```ts
export type CurriculumSystemId = "caie" | "pearson-ial";

export interface CurriculumUnitOption {
  readonly id: string;
  readonly label: string;
  readonly requirement: "compulsory" | "optional" | "pathway";
}

export interface QualificationOption {
  readonly id: string;
  readonly system: CurriculumSystemId;
  readonly label: string;
  readonly specificationVersion: string;
  readonly sourceRegistryId: string;
  readonly sourceDocument: string;
  readonly units: readonly CurriculumUnitOption[];
  readonly certificationRules?: readonly string[];
}
```

Catalog content:

- CAIE 9709: P1 Pure Mathematics 1, P2 Pure Mathematics 2, P3 Pure Mathematics 3, M1 Mechanics, S1 Probability & Statistics 1, S2 Probability & Statistics 2;
- CAIE 9231: FP1 Further Pure Mathematics 1, FP2 Further Pure Mathematics 2, FM Further Mechanics, FPS Further Probability & Statistics;
- Pearson IAL Mathematics: compulsory P1, P2, P3, P4; optional M1, M2, S1, S2, D1. Preserve the five official two-unit certification combinations as display metadata: M1+S1, M1+D1, M1+M2, S1+D1, S1+S2;
- Pearson IAL Further Mathematics: FP1, FP2, FP3, M1, M2, M3, S1, S2, S3, D1.

Use these exact provenance values from the local source registry:

| Catalog entries | `sourceRegistryId` | `sourceDocument` | `specificationVersion` |
|---|---|---|---|
| CAIE 9709 | `caie` | `research/official-sources/files/caie/9709-mathematics-syllabus-2026-2027.pdf` | `2026-2027` |
| CAIE 9231 | `caie` | `research/official-sources/files/caie/9231-further-mathematics-syllabus-2026-2027.pdf` | `2026-2027` |
| Pearson IAL Mathematics / Further Mathematics | `pearson-ial` | `research/official-sources/files/pearson-ial/mathematics-specification-2018-current.pdf` | `Issue 3 - April 2019` |

The Pearson qualification/unit rules come from the visually verified qualification-overview table on PDF page 16 (printed page 10). The profile records the units the student is studying or has studied; it does not claim that a partial selection is a valid certification cash-in.

- [ ] **Step 4: Implement the strict profile contract**

Create `domain.ts` with:

```ts
export type PreparationExperience =
  | "new"
  | "sampled"
  | "mocked"
  | "past-papers";

export interface PreparationProfile {
  schemaVersion: 1;
  guestSpaceId: GuestSpaceId;
  exam: "TMUA";
  entryCycle: string;
  curriculumSystem: CurriculumSystemId;
  qualificationIds: readonly string[];
  unitIds: readonly string[];
  experience: PreparationExperience;
  createdAt: string;
  updatedAt: string;
}
```

`createPreparationProfile` requires an entry cycle matching `^20\d{2}$`, one curriculum system, at least one qualification from that system, at least one unit belonging to a selected qualification, unique IDs, canonical UTC timestamps, and `updatedAt >= createdAt`. It makes no coverage/readiness inference.

- [ ] **Step 5: Implement local profile persistence with explicit absence**

Create:

```ts
export interface PreparationProfileLoadResult {
  profile: PreparationProfile | null;
  issue: "corrupt" | "unsupported" | null;
}

export interface PreparationProfileStore {
  load(guestSpaceId: GuestSpaceId): Promise<PreparationProfileLoadResult>;
  save(profile: PreparationProfile): Promise<{ persisted: boolean }>;
  clear(guestSpaceId: GuestSpaceId): Promise<void>;
}
```

The local key is `admission-breaker:preparation-profile:<guestSpaceId>:v1`. Parse every field exactly; quarantine malformed JSON; never return another Guest Space's profile.

- [ ] **Step 6: Run focused and complete verification**

```bash
pnpm exec vitest run tests/features/preparation-profile
pnpm verify
```

Expected: catalog, domain, isolation, corruption, and persistence tests pass; complete verification remains green.

- [ ] **Step 7: Commit the profile domain and adapters**

```bash
git add src/features/preparation-profile tests/features/preparation-profile
git commit -m "feat: define exact preparation profiles"
```

---

### Task 5: Add the Progressive Profile Panel to the TMUA Hub

**Files:**
- Create: `src/features/preparation-profile/components/ProfilePanel.tsx`
- Create: `tests/features/preparation-profile/components/profile-panel.test.tsx`
- Modify: `src/app/dependencies.ts`
- Modify: `src/features/catalog/pages/TmuaHubPage.tsx`
- Modify: `src/styles/practice.css`
- Modify: `tests/app/tmua-hub-page.test.tsx`
- Modify: `tests/app/front-door-accessibility.test.tsx`

**Interfaces:**
- Consumes: `GuestSpaceStore`, `PreparationProfileStore`, `PREPARATION_CATALOG`, `createPreparationProfile`.
- Produces: accessible profile create/edit UI and an honest TMUA initial state with no generated coverage score.

- [ ] **Step 1: Write failing component behavior tests**

The component test must prove:

```ts
expect(screen.getByRole("heading", { name: "先建立你的 TMUA 准备档案" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "先浏览 TMUA 内容" })).toHaveAttribute("href", "#tmua-content");
expect(screen.queryByText(/AI|Token/)).not.toBeInTheDocument();
```

After choosing CAIE, 9709, P1 and `做过少量题`, submitting must call `onSave` with `curriculumSystem: "caie"`, qualification ID `caie-9709-2026-2027`, unit ID `p1`, and experience `sampled`. Add a second case proving Pearson IAL Mathematics exposes P1-P4 plus M1, M2, S1, S2, D1 from `pearson-ial-mathematics-issue-3`. Submitting with no unit shows an inline error and does not call `onSave`.

- [ ] **Step 2: Run the component test and observe module-not-found failure**

```bash
pnpm exec vitest run tests/features/preparation-profile/components/profile-panel.test.tsx
```

Expected: FAIL because `ProfilePanel` does not exist.

- [ ] **Step 3: Implement the progressive form without a long wizard**

`ProfilePanel` props:

```ts
interface ProfilePanelProps {
  guestSpaceId: GuestSpaceId;
  profile: PreparationProfile | null;
  now: () => Date;
  onSave(profile: PreparationProfile): Promise<{ persisted: boolean }>;
}
```

The panel contains:

1. application-cycle radio group with `2027 Entry` and `2028 Entry`, defaulting to 2027 without preventing a later catalog expansion;
2. curriculum system radio group: CAIE / Pearson Edexcel IAL;
3. qualification checkboxes filtered by system;
4. unit/module checkboxes filtered by selected qualifications;
5. one preparation-experience radio group;
6. primary `保存准备档案` action;
7. secondary anchor `先浏览 TMUA 内容`;
8. visible local boundary copy: `档案当前只保存在这台设备；创建正式账户前不会上传。`;
9. after save, a compact summary with `修改档案` and two honest states: `课程覆盖：等待知识映射` and `实战准备度：等待诊断证据`.

Use native `fieldset`, `legend`, checkbox, radio, and button semantics. Do not add a new form library.

- [ ] **Step 4: Inject the profile store and integrate the TMUA hub**

Extend `AppServices` with:

```ts
profileStore: PreparationProfileStore;
```

`TmuaHubPage` loads Guest Space and its profile together, renders `ProfilePanel` between the hero and journey, and assigns `id="tmua-content"` to the journey wrapper. Profile persistence failure shows a calm warning while leaving the in-memory profile visible.

Before any paper-start button, show: `练习记录当前保存在这台设备。清除浏览器数据可能会丢失记录。`

- [ ] **Step 5: Add responsive academic styling**

Add only token-based styles:

- desktop: two-column profile summary/form with a publication-style left index;
- iPad portrait and mobile: one column with full-width controls;
- minimum control height `2.75rem` and effective touch target at least 44px;
- no gradients, floating AI illustrations, or unrelated value cards;
- use `--color-purple`, `--color-paper`, `--color-paper-raised`, `--color-line`, `--font-serif`, and existing spacing tokens.

- [ ] **Step 6: Run component, hub, accessibility, and complete gates**

```bash
pnpm exec vitest run tests/features/preparation-profile/components/profile-panel.test.tsx tests/app/tmua-hub-page.test.tsx tests/app/front-door-accessibility.test.tsx
pnpm verify
```

Expected: profile create/edit/skip/local-boundary behavior passes; TMUA archive and 2023 Paper 1 entry remain available; the full suite and build pass.

- [ ] **Step 7: Manually inspect six representative viewports**

Inspect `/`, `/exams/tmua`, `/practice/tmua-2023-paper-1`, and a submitted result at:

```text
390 × 844
430 × 932
768 × 1024
1024 × 768
1440 × 900
1728 × 1117
```

Evidence must show: no horizontal overflow, form labels remain attached to controls, all units are reachable, local-storage disclosure appears before practice, and the practice/result layouts remain usable.

- [ ] **Step 8: Commit the progressive profile UI**

```bash
git add src/features/preparation-profile/components src/app/dependencies.ts src/features/catalog/pages/TmuaHubPage.tsx src/styles/practice.css tests/features/preparation-profile/components tests/app/tmua-hub-page.test.tsx tests/app/front-door-accessibility.test.tsx
git commit -m "feat: add progressive TMUA preparation profile"
```

---

### Task 6: Make the Feature Independently Verifiable

**Files:**
- Create: `verification/features/tmua-evidence-safe-guest-profile.yaml`
- Create: `tests/architecture/feature-manifests.test.ts`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-07-14-complete-preparation-system-design.md`
- Modify: `docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md`

**Interfaces:**
- Consumes: all Task 1–5 files and test commands.
- Produces: a reusable feature-manifest gate and synchronized implementation status.

- [ ] **Step 1: Write the failing manifest contract test**

`tests/architecture/feature-manifests.test.ts` scans `verification/features/*.yaml` and requires each manifest to contain:

```ts
interface FeatureVerificationManifest {
  id: string;
  productGoal: string;
  modules: string[];
  dataReads: string[];
  dataWrites: string[];
  permissions: string[];
  events: string[];
  commercialLayer: "free-training" | "paid-interpretation" | "mantou-service";
  gates: Array<{
    level: "V0" | "V1" | "V2" | "V3" | "V4" | "V5";
    command: string;
    blocking: boolean;
  }>;
  manualEvidence: string[];
  releaseBlockers: string[];
}
```

The test rejects unknown keys, empty arrays, duplicate gate levels, and any manifest without exactly one of each V0-V5 gate. Every command must match `pnpm <script-name>` and `<script-name>` must exist in `package.json`; shell fragments and inline file arguments are rejected.

- [ ] **Step 2: Run the test and observe the missing manifest failure**

```bash
pnpm exec vitest run tests/architecture/feature-manifests.test.ts
```

Expected: FAIL because no feature manifest exists.

- [ ] **Step 3: Create the exact feature manifest**

`tmua-evidence-safe-guest-profile.yaml` declares:

- product goal: reduce first-use uncertainty without consuming a past paper;
- modules: learning-space, learning-events, practice, guest-space, preparation-profile, catalog UI;
- reads: local Guest Space, local preparation profile, local practice session, public curriculum catalog;
- writes: local Guest Space, local preparation profile, practice session/events;
- permissions: `guest-owner-local-only`; no delegated grant;
- events: session start/pause/resume, question timing, answer/mark/view, submit/expire;
- commercial layer: `free-training`;
- V0 command: `pnpm typecheck`;
- V1 command: `pnpm verify:guest-profile:domain`;
- V2 command: `pnpm verify:guest-profile:adapters`;
- V3 command: `pnpm verify:guest-profile:journey`;
- V4 command: `pnpm verify:guest-profile:responsive`;
- V5 command: `pnpm verify:architecture`;
- blockers: active time above paper duration, Guest data represented as authenticated Learner data, missing local-boundary disclosure, profile producing readiness without diagnostic evidence, AI copy in the primary journey.

- [ ] **Step 4: Add the feature-manifest gate to the package**

Add:

```json
"verify:guest-profile:domain": "vitest run tests/platform tests/features/practice/domain tests/features/preparation-profile/catalog.test.ts tests/features/preparation-profile/domain.test.ts",
"verify:guest-profile:adapters": "vitest run tests/features/practice/storage tests/features/guest-space/storage tests/features/preparation-profile/storage",
"verify:guest-profile:journey": "vitest run tests/app/tmua-hub-page.test.tsx tests/app/practice-page.test.tsx tests/app/results-page.test.tsx tests/features/preparation-profile/components/profile-panel.test.tsx",
"verify:guest-profile:responsive": "vitest run tests/app/front-door-accessibility.test.tsx tests/app/front-door-css-contract.test.ts",
"verify:features": "vitest run tests/architecture/feature-manifests.test.ts"
```

Update `verify` to run `verify:architecture`, `verify:features`, `verify:tmua-corpus`, all tests, typecheck, and build in that order. Update the package-contract and architecture tests to expect the new command exactly.

- [ ] **Step 5: Synchronize approved and implemented status**

Change the complete-system design status from `对话设计已批准，等待书面规格审阅` to `已批准，分增量实施中`. In the roadmap, mark the evidence-safe Guest/Profile foundation as implemented only if all Task 1–5 gates pass; keep knowledge graph, course mapping, preview, diagnostic, notes, admissions, production RLS, Benchmark, and AI explicitly pending.

- [ ] **Step 6: Run the independent and full release gates**

```bash
pnpm verify:features
pnpm verify
git diff --check
git status --short
```

Expected: the feature manifest is accepted, every Vitest file passes, content reports 18 papers / 360 shells / 20 published questions with P0 zero, TypeScript succeeds, Vite builds, and only the pre-existing unstaged `.gitignore`, `README.md`, and `research/` changes remain outside task commits.

- [ ] **Step 7: Commit validation and documentation only**

```bash
git add verification/features/tmua-evidence-safe-guest-profile.yaml tests/architecture/feature-manifests.test.ts package.json tests/package-contract.test.ts tests/architecture/module-boundaries.test.ts docs/superpowers/specs/2026-07-14-complete-preparation-system-design.md docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md
git commit -m "test: verify guest profile feature boundaries"
```

## Completion Gate

Run from the implementation worktree:

```bash
pnpm verify
git log --oneline -6
git status --short
```

The plan is complete only when:

1. total active question time cannot exceed 75 minutes;
2. hidden/background intervals do not count as active question time;
3. result copy does not call active-page time “thinking time”;
4. local anonymous use is a real `GuestSpace`, not `usr_local-demo`;
5. the student can create, edit, or skip an exact CAIE/Pearson preparation profile;
6. no coverage/readiness score appears before knowledge mapping and diagnostic evidence;
7. local-only data boundaries appear before starting practice;
8. AI and paid interpretation are absent from the primary journey;
9. phone, iPad portrait/landscape, and desktop remain usable;
10. the feature has an Agent-runnable manifest and all complete verification gates pass.

## Follow-on Plans

After this plan is reviewed and implemented, write and execute these separate plans in order:

1. `TMUA Knowledge Graph, CAIE/Pearson Mapping, and Review Notes`;
2. `TMUA Five-Question Preview, Eight-Question Diagnostic, and Free Evidence Report`;
3. `TMUA Admissions Registry and Complete Preparation Hub Integration`;
4. `TMUA Paper-by-Paper Publication Batches`;
5. `Production Identity, PostgreSQL RLS, Grants, Audit, Export, and Deletion`.

No follow-on plan may reuse active-time evidence collected before Task 1 without marking it as legacy/unreliable.
