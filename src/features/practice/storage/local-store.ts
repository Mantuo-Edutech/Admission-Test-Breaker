import type { ActorRef } from "../../../platform/learner-space/domain.js";
import {
  appendLearningEvent,
  type PracticeLearningEvent,
  type PracticeLearningEventDraft,
} from "../../../platform/learning-events/domain.js";
import {
  asLearnerSpaceId,
  asPracticeSessionId,
  asUserId,
  assertCanonicalUtcTimestamp,
} from "../../../platform/shared/ids.js";
import {
  TMUA_2023_P1_QUESTION_COUNT,
  type PracticeSession,
} from "../domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "./store.js";

export const PRACTICE_SESSION_STORAGE_KEY = "tmua:practice:current:v1";
const corruptKeyPrefix = "tmua:practice:corrupt:";

const sessionFields = new Set([
  "schemaVersion",
  "id",
  "learnerSpaceId",
  "startedBy",
  "paperId",
  "status",
  "startedAt",
  "deadlineAt",
  "submittedAt",
  "currentQuestion",
  "answers",
  "markedQuestionIds",
  "timingByQuestionMs",
  "activeQuestionEnteredAt",
  "events",
]);

const eventFields = new Set([
  "id",
  "schemaVersion",
  "learnerSpaceId",
  "sessionId",
  "sequence",
  "type",
  "actor",
  "occurredAt",
  "payload",
]);

class UnsupportedSessionError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertExactFields(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${label} contains unsupported field ${key}`);
    }
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertActor(value: unknown): ActorRef {
  assertRecord(value, "startedBy");
  if (
    value.kind === "student" ||
    value.kind === "teacher" ||
    value.kind === "parent"
  ) {
    assertNonEmptyString(value.userId, "startedBy.userId");
    return { kind: value.kind, userId: asUserId(value.userId) };
  }

  if (value.kind === "agent" || value.kind === "system") {
    assertNonEmptyString(value.actorId, "startedBy.actorId");
    return { kind: value.kind, actorId: value.actorId };
  }

  throw new Error("startedBy kind is invalid");
}

function actorsEqual(left: ActorRef, right: ActorRef): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if ("userId" in left && "userId" in right) {
    return left.userId === right.userId;
  }
  if ("actorId" in left && "actorId" in right) {
    return left.actorId === right.actorId;
  }
  return false;
}

const questionIdPattern = /^tmua-2023-p1-q(?:0[1-9]|1\d|20)$/;

function assertQuestionId(value: string, label: string): void {
  if (!questionIdPattern.test(value)) {
    throw new Error(`${label} is not a TMUA 2023 Paper 1 question ID`);
  }
}

function parseAnswers(value: unknown): Record<string, string> {
  assertRecord(value, "answers");
  const answers: Record<string, string> = {};
  for (const [questionId, answer] of Object.entries(value)) {
    assertQuestionId(questionId, "Answer question ID");
    if (typeof answer !== "string" || !/^[A-Z]$/.test(answer)) {
      throw new Error(`Answer for ${questionId} is invalid`);
    }
    answers[questionId] = answer;
  }
  return answers;
}

function parseMarkedQuestions(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("markedQuestionIds must be a string array");
  }
  value.forEach((questionId) => assertQuestionId(questionId, "Marked question ID"));
  if (new Set(value).size !== value.length) {
    throw new Error("markedQuestionIds cannot contain duplicates");
  }
  return [...value];
}

function parseTiming(value: unknown): Record<string, number> {
  assertRecord(value, "timingByQuestionMs");
  const timing: Record<string, number> = {};
  for (const [questionId, activeMs] of Object.entries(value)) {
    assertQuestionId(questionId, "Timing question ID");
    if (
      typeof activeMs !== "number" ||
      !Number.isInteger(activeMs) ||
      activeMs < 0
    ) {
      throw new Error(`Timing for ${questionId} must be a non-negative integer`);
    }
    timing[questionId] = activeMs;
  }
  return timing;
}

function parseEvents(
  value: unknown,
  learnerSpaceId: PracticeSession["learnerSpaceId"],
  sessionId: PracticeSession["id"],
): readonly PracticeLearningEvent[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("events must be a non-empty array");
  }

  let rebuilt: readonly PracticeLearningEvent[] = [];
  value.forEach((candidate, index) => {
    assertRecord(candidate, `events.${index}`);
    assertExactFields(candidate, eventFields, `events.${index}`);
    if (candidate.schemaVersion !== 1 || candidate.sequence !== index + 1) {
      throw new Error(`events.${index} has an invalid version or sequence`);
    }
    if (
      candidate.learnerSpaceId !== learnerSpaceId ||
      candidate.sessionId !== sessionId
    ) {
      throw new Error(`events.${index} crosses the session tenant boundary`);
    }

    const draft = {
      id: candidate.id,
      learnerSpaceId: candidate.learnerSpaceId,
      sessionId: candidate.sessionId,
      type: candidate.type,
      actor: candidate.actor,
      occurredAt: candidate.occurredAt,
      payload: candidate.payload,
    } as PracticeLearningEventDraft;
    rebuilt = appendLearningEvent(rebuilt, draft).events;
  });

  return rebuilt;
}

function parseSession(value: unknown): PracticeSession {
  assertRecord(value, "Practice session");
  if (value.schemaVersion !== 1) {
    throw new UnsupportedSessionError("Practice session schema is unsupported");
  }
  assertExactFields(value, sessionFields, "Practice session");

  assertNonEmptyString(value.id, "Practice session ID");
  assertNonEmptyString(value.learnerSpaceId, "Learner space ID");
  const id = asPracticeSessionId(value.id);
  const learnerSpaceId = asLearnerSpaceId(value.learnerSpaceId);
  const startedBy = assertActor(value.startedBy);

  if (value.paperId !== "tmua-2023-p1") {
    throw new Error("Practice paper is invalid");
  }
  if (
    value.status !== "active" &&
    value.status !== "submitted" &&
    value.status !== "expired"
  ) {
    throw new Error("Practice session status is invalid");
  }

  assertNonEmptyString(value.startedAt, "startedAt");
  assertNonEmptyString(value.deadlineAt, "deadlineAt");
  assertNonEmptyString(value.activeQuestionEnteredAt, "activeQuestionEnteredAt");
  assertCanonicalUtcTimestamp(value.startedAt, "startedAt");
  assertCanonicalUtcTimestamp(value.deadlineAt, "deadlineAt");
  assertCanonicalUtcTimestamp(value.activeQuestionEnteredAt, "activeQuestionEnteredAt");

  if (
    !Number.isInteger(value.currentQuestion) ||
    (value.currentQuestion as number) < 1 ||
    (value.currentQuestion as number) > TMUA_2023_P1_QUESTION_COUNT
  ) {
    throw new Error("currentQuestion is invalid");
  }

  if (value.status === "active" && value.submittedAt !== undefined) {
    throw new Error("An active session cannot have submittedAt");
  }
  if (value.status !== "active") {
    assertNonEmptyString(value.submittedAt, "submittedAt");
    assertCanonicalUtcTimestamp(value.submittedAt, "submittedAt");
  }

  const events = parseEvents(value.events, learnerSpaceId, id);
  const firstEvent = events[0];
  if (
    firstEvent?.type !== "session_started" ||
    firstEvent.payload.paperId !== value.paperId ||
    firstEvent.payload.deadlineAt !== value.deadlineAt ||
    !actorsEqual(firstEvent.actor, startedBy)
  ) {
    throw new Error("The session_started event does not match the session");
  }

  const lastEvent = events.at(-1);
  if (
    (value.status === "submitted" && lastEvent?.type !== "session_submitted") ||
    (value.status === "expired" && lastEvent?.type !== "session_expired") ||
    (value.status === "active" &&
      events.some(
        (event) =>
          event.type === "session_submitted" || event.type === "session_expired",
      ))
  ) {
    throw new Error("Finalization events do not match the session status");
  }

  return {
    schemaVersion: 1,
    id,
    learnerSpaceId,
    startedBy,
    paperId: "tmua-2023-p1",
    status: value.status,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    ...(value.submittedAt === undefined
      ? {}
      : { submittedAt: value.submittedAt as string }),
    currentQuestion: value.currentQuestion as number,
    answers: parseAnswers(value.answers),
    markedQuestionIds: parseMarkedQuestions(value.markedQuestionIds),
    timingByQuestionMs: parseTiming(value.timingByQuestionMs),
    activeQuestionEnteredAt: value.activeQuestionEnteredAt,
    events,
  };
}

export class LocalPracticeSessionStore implements PracticeSessionStore {
  private memorySession: PracticeSession | null = null;

  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    let raw: string | null;
    try {
      raw = this.storage.getItem(PRACTICE_SESSION_STORAGE_KEY);
    } catch {
      return { session: this.memorySession, issue: null };
    }

    if (raw === null) {
      return { session: this.memorySession, issue: null };
    }

    try {
      const session = parseSession(JSON.parse(raw) as unknown);
      this.memorySession = session;
      return { session, issue: null };
    } catch (error) {
      this.memorySession = null;
      this.quarantine(raw);
      return {
        session: null,
        issue: error instanceof UnsupportedSessionError ? "unsupported" : "corrupt",
      };
    }
  }

  async save(session: PracticeSession): Promise<SessionSaveResult> {
    const serialized = JSON.stringify(session);
    parseSession(JSON.parse(serialized) as unknown);
    this.memorySession = session;

    try {
      this.storage.setItem(PRACTICE_SESSION_STORAGE_KEY, serialized);
      return { persisted: true };
    } catch {
      return { persisted: false };
    }
  }

  async clearCurrent(): Promise<void> {
    this.memorySession = null;
    try {
      this.storage.removeItem(PRACTICE_SESSION_STORAGE_KEY);
    } catch {
      // Memory state is still cleared when browser persistence is unavailable.
    }
  }

  private quarantine(raw: string): void {
    const timestamp = this.now().toISOString().replace(/[:.]/g, "-");
    try {
      this.storage.setItem(`${corruptKeyPrefix}${timestamp}`, raw);
    } catch {
      // Preserve the original error classification even if quarantine is unavailable.
    }
    try {
      this.storage.removeItem(PRACTICE_SESSION_STORAGE_KEY);
    } catch {
      // Loading still returns an issue and never trusts the malformed record.
    }
  }
}
