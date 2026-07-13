import type { ActorRef } from "../../../platform/learner-space/domain.js";
import {
  appendLearningEvent,
  type PracticeLearningEvent,
} from "../../../platform/learning-events/domain.js";
import type {
  LearnerSpaceId,
  LearningEventId,
  PracticeSessionId,
} from "../../../platform/shared/ids.js";

export const TMUA_2023_P1_DURATION_MS = 75 * 60 * 1_000;
export const TMUA_2023_P1_QUESTION_COUNT = 20;

export interface PracticeSession {
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
  activeQuestionEnteredAt: string;
  events: readonly PracticeLearningEvent[];
}

export interface CreatePracticeSessionInput {
  id: PracticeSessionId;
  learnerSpaceId: LearnerSpaceId;
  actor: ActorRef;
  startedAt: string;
  eventId: LearningEventId;
}

export function questionIdForNumber(questionNumber: number): string {
  if (
    !Number.isInteger(questionNumber) ||
    questionNumber < 1 ||
    questionNumber > TMUA_2023_P1_QUESTION_COUNT
  ) {
    throw new Error(
      `Question number must be between 1 and ${TMUA_2023_P1_QUESTION_COUNT}`,
    );
  }

  return `tmua-2023-p1-q${String(questionNumber).padStart(2, "0")}`;
}

export function createPracticeSession(
  input: CreatePracticeSessionInput,
): PracticeSession {
  const deadlineAt = new Date(
    Date.parse(input.startedAt) + TMUA_2023_P1_DURATION_MS,
  ).toISOString();

  const appended = appendLearningEvent([], {
    id: input.eventId,
    learnerSpaceId: input.learnerSpaceId,
    sessionId: input.id,
    type: "session_started",
    actor: input.actor,
    occurredAt: input.startedAt,
    payload: { paperId: "tmua-2023-p1", deadlineAt },
  });

  return {
    schemaVersion: 1,
    id: input.id,
    learnerSpaceId: input.learnerSpaceId,
    startedBy: input.actor,
    paperId: "tmua-2023-p1",
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
