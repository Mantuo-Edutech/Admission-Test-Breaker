import type { ActorRef } from "../learner-space/domain.js";
import {
  asLearnerSpaceId,
  asLearningEventId,
  asPracticeSessionId,
  asUserId,
  assertCanonicalUtcTimestamp,
  type LearnerSpaceId,
  type LearningEventId,
  type PracticeSessionId,
} from "../shared/ids.js";

export interface LearningEvent<
  TType extends string,
  TPayload extends object,
> {
  id: LearningEventId;
  schemaVersion: 1;
  learnerSpaceId: LearnerSpaceId;
  sessionId: PracticeSessionId;
  sequence: number;
  type: TType;
  actor: ActorRef;
  occurredAt: string;
  payload: TPayload;
}

export interface LearningEventDraft<
  TType extends string,
  TPayload extends object,
> {
  id: LearningEventId;
  learnerSpaceId: LearnerSpaceId;
  sessionId: PracticeSessionId;
  type: TType;
  actor: ActorRef;
  occurredAt: string;
  payload: TPayload;
}

type QuestionPayload = { questionId: string };
type AnswerSelectedPayload = QuestionPayload & { answer: string };
type AnswerChangedPayload = QuestionPayload & { from: string; to: string };
type SessionStartedPayload = { paperId: string; deadlineAt: string };
type SessionPausePayload = {
  reason: "visibility_hidden" | "pagehide";
};
type SessionResumePayload = {
  reason: "visibility_visible";
};
type SubmissionPayload = { answeredCount: number };
type SubmissionOpenedPayload = { unansweredCount: number };
type QuestionTimePayload = QuestionPayload & { activeMs: number };

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

export type PracticeLearningEventDraft =
  | LearningEventDraft<"session_started", SessionStartedPayload>
  | LearningEventDraft<"session_paused", SessionPausePayload>
  | LearningEventDraft<"session_resumed", SessionResumePayload>
  | LearningEventDraft<"question_viewed", QuestionPayload>
  | LearningEventDraft<"answer_selected", AnswerSelectedPayload>
  | LearningEventDraft<"answer_changed", AnswerChangedPayload>
  | LearningEventDraft<"question_marked", QuestionPayload>
  | LearningEventDraft<"question_unmarked", QuestionPayload>
  | LearningEventDraft<"submission_opened", SubmissionOpenedPayload>
  | LearningEventDraft<"session_submitted", SubmissionPayload>
  | LearningEventDraft<"session_expired", SubmissionPayload>
  | LearningEventDraft<"question_time_recorded", QuestionTimePayload>;

export interface AppendResult {
  status: "appended" | "duplicate";
  event: PracticeLearningEvent;
  events: readonly PracticeLearningEvent[];
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function assertExactPayloadKeys(
  payload: object,
  expectedKeys: readonly string[],
): void {
  const expected = new Set(expectedKeys);
  for (const key of Object.keys(payload)) {
    if (!expected.has(key)) {
      throw new Error(`unexpected payload field: ${key}`);
    }
  }

  for (const key of expected) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      throw new Error(`missing payload field: ${key}`);
    }
  }
}

function assertQuestionPayload(payload: QuestionPayload): void {
  assertNonEmptyString(payload.questionId, "questionId");
}

function assertPurposefulPayload(event: PracticeLearningEventDraft): void {
  switch (event.type) {
    case "session_started":
      assertExactPayloadKeys(event.payload, ["paperId", "deadlineAt"]);
      assertNonEmptyString(event.payload.paperId, "paperId");
      assertCanonicalUtcTimestamp(event.payload.deadlineAt, "deadlineAt");
      return;
    case "session_paused":
      assertExactPayloadKeys(event.payload, ["reason"]);
      if (
        event.payload.reason !== "visibility_hidden" &&
        event.payload.reason !== "pagehide"
      ) {
        throw new Error("session_paused reason is invalid");
      }
      return;
    case "session_resumed":
      assertExactPayloadKeys(event.payload, ["reason"]);
      if (event.payload.reason !== "visibility_visible") {
        throw new Error("session_resumed reason is invalid");
      }
      return;
    case "question_viewed":
    case "question_marked":
    case "question_unmarked":
      assertExactPayloadKeys(event.payload, ["questionId"]);
      assertQuestionPayload(event.payload);
      return;
    case "answer_selected":
      assertExactPayloadKeys(event.payload, ["questionId", "answer"]);
      assertQuestionPayload(event.payload);
      assertNonEmptyString(event.payload.answer, "answer");
      return;
    case "answer_changed":
      assertExactPayloadKeys(event.payload, ["questionId", "from", "to"]);
      assertQuestionPayload(event.payload);
      assertNonEmptyString(event.payload.from, "answer from");
      assertNonEmptyString(event.payload.to, "answer to");
      if (event.payload.from === event.payload.to) {
        throw new Error("answer_changed must change the answer");
      }
      return;
    case "submission_opened":
      assertExactPayloadKeys(event.payload, ["unansweredCount"]);
      assertNonNegativeInteger(event.payload.unansweredCount, "unansweredCount");
      return;
    case "session_submitted":
    case "session_expired":
      assertExactPayloadKeys(event.payload, ["answeredCount"]);
      assertNonNegativeInteger(event.payload.answeredCount, "answeredCount");
      return;
    case "question_time_recorded":
      assertExactPayloadKeys(event.payload, ["questionId", "activeMs"]);
      assertQuestionPayload(event.payload);
      assertNonNegativeInteger(event.payload.activeMs, "activeMs");
      return;
  }
}

function assertActor(actor: ActorRef): void {
  if ("userId" in actor) {
    asUserId(actor.userId);
    return;
  }

  assertNonEmptyString(actor.actorId, "actorId");
}

function normalizeDraft(
  draft: PracticeLearningEventDraft,
): PracticeLearningEventDraft {
  asLearningEventId(draft.id);
  asLearnerSpaceId(draft.learnerSpaceId);
  asPracticeSessionId(draft.sessionId);
  assertActor(draft.actor);
  assertCanonicalUtcTimestamp(draft.occurredAt, "Event occurredAt");
  assertPurposefulPayload(draft);
  return draft;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }

  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord).sort();
    const rightKeys = Object.keys(rightRecord).sort();
    return (
      valuesEqual(leftKeys, rightKeys) &&
      leftKeys.every((key) => valuesEqual(leftRecord[key], rightRecord[key]))
    );
  }

  return false;
}

function eventMatchesDraft(
  event: PracticeLearningEvent,
  draft: PracticeLearningEventDraft,
): boolean {
  return (
    event.id === draft.id &&
    event.learnerSpaceId === draft.learnerSpaceId &&
    event.sessionId === draft.sessionId &&
    event.type === draft.type &&
    event.occurredAt === draft.occurredAt &&
    valuesEqual(event.actor, draft.actor) &&
    valuesEqual(event.payload, draft.payload)
  );
}

export function appendLearningEvent(
  currentEvents: readonly PracticeLearningEvent[],
  unvalidatedDraft: PracticeLearningEventDraft,
): AppendResult {
  const draft = normalizeDraft(unvalidatedDraft);
  const duplicate = currentEvents.find((event) => event.id === draft.id);

  if (duplicate !== undefined) {
    if (!eventMatchesDraft(duplicate, draft)) {
      throw new Error(`Learning event idempotency conflict for ${draft.id}`);
    }

    return { status: "duplicate", event: duplicate, events: currentEvents };
  }

  const first = currentEvents[0];
  if (
    first !== undefined &&
    (first.learnerSpaceId !== draft.learnerSpaceId ||
      first.sessionId !== draft.sessionId)
  ) {
    throw new Error("Learning events must belong to the same learner space and session");
  }

  currentEvents.forEach((event, index) => {
    if (event.sequence !== index + 1) {
      throw new Error("Existing learning event sequence is not consecutive");
    }
  });

  const event = {
    ...draft,
    schemaVersion: 1,
    sequence: currentEvents.length + 1,
  } as PracticeLearningEvent;

  return {
    status: "appended",
    event,
    events: [...currentEvents, event],
  };
}
