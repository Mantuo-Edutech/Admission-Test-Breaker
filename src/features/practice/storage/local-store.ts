import type { ActorRef } from "../../../platform/learning-space/domain.js";
import {
  appendLearningEvent,
  type PracticeLearningEvent,
  type PracticeLearningEventDraft,
} from "../../../platform/learning-events/domain.js";
import {
  asLearningSpaceId,
  asPracticeSessionId,
  asUserId,
  assertCanonicalUtcTimestamp,
} from "../../../platform/shared/ids.js";
import type { PracticeSession } from "../domain/session.js";
import type {
  PracticeSessionStore,
  SessionLoadResult,
  SessionSaveResult,
} from "./store.js";
import type { PracticeHistoryArchive } from "../history/store.js";
import { publishedContentRefForPaperId } from "../content/published-revisions.js";

export const PRACTICE_SESSION_STORAGE_KEY = "admission-test-breaker:practice:current:v1";
const LEGACY_PRACTICE_SESSION_STORAGE_KEY = "tmua:practice:current:v1";
const corruptKeyPrefix = "admission-test-breaker:practice:corrupt:";

const sessionFields = new Set([
  "schemaVersion",
  "id",
  "learningSpaceId",
  "startedBy",
  "paperId",
  "paperRevisionId",
  "contentDigest",
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
const legacySessionFields = new Set(
  [...sessionFields].filter((field) => field !== "paperRevisionId" && field !== "contentDigest"),
);

const eventFields = new Set([
  "id",
  "schemaVersion",
  "learningSpaceId",
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
  if (value.kind === "guest") {
    assertNonEmptyString(value.actorId, "startedBy.actorId");
    return { kind: "guest", actorId: value.actorId };
  }

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

const paperIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function assertQuestionId(value: string, paperId: string, label: string): void {
  const expectedPrefix = `${paperId}-q`;
  if (!value.startsWith(expectedPrefix) || !/^(?:0[1-9]|[1-9]\d)$/u.test(value.slice(expectedPrefix.length))) {
    throw new Error(`${label} does not belong to ${paperId}`);
  }
}

function parseAnswers(value: unknown, paperId: string): Record<string, string> {
  assertRecord(value, "answers");
  const answers: Record<string, string> = {};
  for (const [questionId, answer] of Object.entries(value)) {
    assertQuestionId(questionId, paperId, "Answer question ID");
    if (
      typeof answer !== "string" ||
      answer.trim().length === 0 ||
      answer.length > 20_000
    ) {
      throw new Error(`Answer for ${questionId} is invalid`);
    }
    answers[questionId] = answer;
  }
  return answers;
}

function parseMarkedQuestions(value: unknown, paperId: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("markedQuestionIds must be a string array");
  }
  value.forEach((questionId) => assertQuestionId(questionId, paperId, "Marked question ID"));
  if (new Set(value).size !== value.length) {
    throw new Error("markedQuestionIds cannot contain duplicates");
  }
  return [...value];
}

function parseTiming(value: unknown, paperId: string): Record<string, number> {
  assertRecord(value, "timingByQuestionMs");
  const timing: Record<string, number> = {};
  for (const [questionId, activeMs] of Object.entries(value)) {
    assertQuestionId(questionId, paperId, "Timing question ID");
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
  learningSpaceId: PracticeSession["learningSpaceId"],
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
      candidate.learningSpaceId !== learningSpaceId ||
      candidate.sessionId !== sessionId
    ) {
      throw new Error(`events.${index} crosses the session tenant boundary`);
    }

    const draft = {
      id: candidate.id,
      learningSpaceId: candidate.learningSpaceId,
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

export function parseStoredPracticeSession(value: unknown): PracticeSession {
  assertRecord(value, "Practice session");
  if (value.schemaVersion !== 2 && value.schemaVersion !== 3) {
    throw new UnsupportedSessionError("Practice session schema is unsupported");
  }
  const legacy = value.schemaVersion === 2;
  assertExactFields(value, legacy ? legacySessionFields : sessionFields, "Practice session");

  assertNonEmptyString(value.id, "Practice session ID");
  assertNonEmptyString(value.learningSpaceId, "Learning space ID");
  const id = asPracticeSessionId(value.id);
  const learningSpaceId = asLearningSpaceId(value.learningSpaceId);
  const startedBy = assertActor(value.startedBy);

  if (typeof value.paperId !== "string" || !paperIdPattern.test(value.paperId)) {
    throw new Error("Practice paper is invalid");
  }
  const paperId = value.paperId;
  const legacyContentRef = legacy ? publishedContentRefForPaperId(paperId) : null;
  if (legacy && legacyContentRef === null) {
    throw new UnsupportedSessionError("Legacy practice content revision is no longer available");
  }
  const paperRevisionId = legacy ? legacyContentRef!.paperRevisionId : value.paperRevisionId;
  const contentDigest = legacy ? legacyContentRef!.contentDigest : value.contentDigest;
  if (
    typeof paperRevisionId !== "string" ||
    !new RegExp(`^${paperId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}-r[1-9]\\d*$`, "u").test(paperRevisionId) ||
    typeof contentDigest !== "string" ||
    !/^[a-f0-9]{64}$/u.test(contentDigest)
  ) {
    throw new Error("Practice content revision is invalid");
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
  assertCanonicalUtcTimestamp(value.startedAt, "startedAt");
  assertCanonicalUtcTimestamp(value.deadlineAt, "deadlineAt");
  const activeQuestionEnteredAt = value.activeQuestionEnteredAt;
  if (activeQuestionEnteredAt !== null) {
    assertNonEmptyString(activeQuestionEnteredAt, "activeQuestionEnteredAt");
    assertCanonicalUtcTimestamp(activeQuestionEnteredAt, "activeQuestionEnteredAt");
  }

  if (
    !Number.isInteger(value.currentQuestion) ||
    (value.currentQuestion as number) < 1 ||
    (value.currentQuestion as number) > 99
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

  const events = parseEvents(value.events, learningSpaceId, id);
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
    schemaVersion: 3,
    id,
    learningSpaceId,
    startedBy,
    paperId,
    paperRevisionId,
    contentDigest,
    status: value.status,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    ...(value.submittedAt === undefined
      ? {}
      : { submittedAt: value.submittedAt as string }),
    currentQuestion: value.currentQuestion as number,
    answers: parseAnswers(value.answers, paperId),
    markedQuestionIds: parseMarkedQuestions(value.markedQuestionIds, paperId),
    timingByQuestionMs: parseTiming(value.timingByQuestionMs, paperId),
    activeQuestionEnteredAt,
    events,
  };
}

export class LocalPracticeSessionStore implements PracticeSessionStore {
  private memorySession: PracticeSession | null = null;

  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date = () => new Date(),
    private readonly history?: PracticeHistoryArchive,
  ) {}

  async loadCurrent(): Promise<SessionLoadResult> {
    let raw: string | null;
    try {
      raw = this.storage.getItem(PRACTICE_SESSION_STORAGE_KEY) ?? this.storage.getItem(LEGACY_PRACTICE_SESSION_STORAGE_KEY);
    } catch {
      return { session: this.memorySession, issue: null };
    }

    if (raw === null) {
      return { session: this.memorySession, issue: null };
    }

    try {
      const session = parseStoredPracticeSession(JSON.parse(raw) as unknown);
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
    parseStoredPracticeSession(JSON.parse(serialized) as unknown);
    this.memorySession = session;
    await this.history?.record(session);

    try {
      this.storage.setItem(PRACTICE_SESSION_STORAGE_KEY, serialized);
      this.storage.removeItem(LEGACY_PRACTICE_SESSION_STORAGE_KEY);
      return { persisted: true };
    } catch {
      return { persisted: false };
    }
  }

  async clearCurrent(): Promise<void> {
    this.memorySession = null;
    try {
      this.storage.removeItem(PRACTICE_SESSION_STORAGE_KEY);
      this.storage.removeItem(LEGACY_PRACTICE_SESSION_STORAGE_KEY);
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
      this.storage.removeItem(LEGACY_PRACTICE_SESSION_STORAGE_KEY);
    } catch {
      // Loading still returns an issue and never trusts the malformed record.
    }
  }
}
