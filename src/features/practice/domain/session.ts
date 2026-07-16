import type { ActorRef } from "../../../platform/learning-space/domain.js";
import {
  appendLearningEvent,
  type PracticeLearningEvent,
} from "../../../platform/learning-events/domain.js";
import type {
  LearningSpaceId,
  LearningEventId,
  PracticeSessionId,
} from "../../../platform/shared/ids.js";

export const TMUA_PAPER_DURATION_MS = 75 * 60 * 1_000;
export const TMUA_PAPER_QUESTION_COUNT = 20;
export const TMUA_2023_P1_DURATION_MS = TMUA_PAPER_DURATION_MS;
export const TMUA_2023_P1_QUESTION_COUNT = TMUA_PAPER_QUESTION_COUNT;

export interface PracticeSession {
  schemaVersion: 2;
  id: PracticeSessionId;
  learningSpaceId: LearningSpaceId;
  startedBy: ActorRef;
  paperId: string;
  status: "active" | "submitted" | "expired";
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
  currentQuestion: number;
  answers: Record<string, string>;
  markedQuestionIds: string[];
  timingByQuestionMs: Record<string, number>;
  activeQuestionEnteredAt: string | null;
  events: readonly PracticeLearningEvent[];
}

export interface CreatePracticeSessionInput {
  id: PracticeSessionId;
  learningSpaceId: LearningSpaceId;
  actor: ActorRef;
  startedAt: string;
  eventId: LearningEventId;
  paperId?: string;
}

export function questionIdForNumber(
  questionNumber: number,
  paperId = "tmua-2023-p1",
): string {
  if (
    !Number.isInteger(questionNumber) ||
    questionNumber < 1 ||
    questionNumber > TMUA_2023_P1_QUESTION_COUNT
  ) {
    throw new Error(
      `Question number must be between 1 and ${TMUA_2023_P1_QUESTION_COUNT}`,
    );
  }

  if (!/^tmua-.+-p[12]$/u.test(paperId)) {
    throw new Error("Practice paper ID is invalid");
  }
  return `${paperId}-q${String(questionNumber).padStart(2, "0")}`;
}

export function createPracticeSession(
  input: CreatePracticeSessionInput,
): PracticeSession {
  const paperId = input.paperId ?? "tmua-2023-p1";
  if (!/^tmua-.+-p[12]$/u.test(paperId)) {
    throw new Error("Practice paper ID is invalid");
  }
  const deadlineAt = new Date(
    Date.parse(input.startedAt) + TMUA_2023_P1_DURATION_MS,
  ).toISOString();

  const appended = appendLearningEvent([], {
    id: input.eventId,
    learningSpaceId: input.learningSpaceId,
    sessionId: input.id,
    type: "session_started",
    actor: input.actor,
    occurredAt: input.startedAt,
    payload: { paperId, deadlineAt },
  });

  return {
    schemaVersion: 2,
    id: input.id,
    learningSpaceId: input.learningSpaceId,
    startedBy: input.actor,
    paperId,
    status: "active",
    startedAt: input.startedAt,
    deadlineAt,
    currentQuestion: 1,
    answers: {},
    markedQuestionIds: [],
    timingByQuestionMs: {},
    activeQuestionEnteredAt: input.startedAt,
    events: appended.events,
  };
}
