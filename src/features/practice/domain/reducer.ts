import { appendLearningEvent } from "../../../platform/learning-events/domain.js";
import type { LearningEventId } from "../../../platform/shared/ids.js";
import {
  questionIdForNumber,
  type PracticeSession,
} from "./session.js";

export type PracticeSessionAction =
  | {
      type: "answer";
      eventId: LearningEventId;
      questionId: string;
      answer: string;
      at: string;
    }
  | {
      type: "toggle-mark";
      eventId: LearningEventId;
      questionId: string;
      at: string;
    }
  | {
      type: "view";
      eventId: LearningEventId;
      timeEventId: LearningEventId;
      questionNumber: number;
      at: string;
    }
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
  | {
      type: "open-submission";
      eventId: LearningEventId;
      at: string;
      totalQuestions: number;
    }
  | {
      type: "submit";
      eventId: LearningEventId;
      timeEventId: LearningEventId;
      at: string;
      reason: "student";
    }
  | {
      type: "expire";
      eventId: LearningEventId;
      timeEventId: LearningEventId;
      at: string;
    };

function appendEvent(
  session: PracticeSession,
  draft: Parameters<typeof appendLearningEvent>[1],
): PracticeSession {
  return {
    ...session,
    events: appendLearningEvent(session.events, draft).events,
  };
}

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
  const paperBudgetMs = Math.max(
    0,
    Date.parse(session.deadlineAt) - Date.parse(session.startedAt),
  );
  const recordedActiveMs = Object.values(session.timingByQuestionMs).reduce(
    (total, questionActiveMs) => total + questionActiveMs,
    0,
  );
  const remainingPaperBudgetMs = Math.max(0, paperBudgetMs - recordedActiveMs);
  const activeMs = Math.min(
    Math.max(0, segmentEnd - segmentStart),
    remainingPaperBudgetMs,
  );
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
    learningSpaceId: session.learningSpaceId,
    sessionId: session.id,
    type: "question_time_recorded",
    actor: session.startedBy,
    occurredAt: at,
    payload: { questionId, activeMs },
  });
}

function answerQuestion(
  session: PracticeSession,
  action: Extract<PracticeSessionAction, { type: "answer" }>,
): PracticeSession {
  const existingAnswer = session.answers[action.questionId];
  if (existingAnswer === action.answer) {
    return session;
  }

  const nextSession = {
    ...session,
    answers: { ...session.answers, [action.questionId]: action.answer },
  };

  if (existingAnswer === undefined) {
    return appendEvent(nextSession, {
      id: action.eventId,
      learningSpaceId: session.learningSpaceId,
      sessionId: session.id,
      type: "answer_selected",
      actor: session.startedBy,
      occurredAt: action.at,
      payload: { questionId: action.questionId, answer: action.answer },
    });
  }

  return appendEvent(nextSession, {
    id: action.eventId,
    learningSpaceId: session.learningSpaceId,
    sessionId: session.id,
    type: "answer_changed",
    actor: session.startedBy,
    occurredAt: action.at,
    payload: {
      questionId: action.questionId,
      from: existingAnswer,
      to: action.answer,
    },
  });
}

function toggleMark(
  session: PracticeSession,
  action: Extract<PracticeSessionAction, { type: "toggle-mark" }>,
): PracticeSession {
  const isMarked = session.markedQuestionIds.includes(action.questionId);
  const markedQuestionIds = isMarked
    ? session.markedQuestionIds.filter((id) => id !== action.questionId)
    : [...session.markedQuestionIds, action.questionId];

  return appendEvent({ ...session, markedQuestionIds }, {
    id: action.eventId,
    learningSpaceId: session.learningSpaceId,
    sessionId: session.id,
    type: isMarked ? "question_unmarked" : "question_marked",
    actor: session.startedBy,
    occurredAt: action.at,
    payload: { questionId: action.questionId },
  });
}

function viewQuestion(
  session: PracticeSession,
  action: Extract<PracticeSessionAction, { type: "view" }>,
): PracticeSession {
  if (action.questionNumber === session.currentQuestion) {
    return session;
  }

  const targetQuestionId = questionIdForNumber(action.questionNumber);
  const timed = recordActiveQuestionTime(session, action.timeEventId, action.at);

  return appendEvent(
    {
      ...timed,
      currentQuestion: action.questionNumber,
      activeQuestionEnteredAt: action.at,
    },
    {
      id: action.eventId,
      learningSpaceId: session.learningSpaceId,
      sessionId: session.id,
      type: "question_viewed",
      actor: session.startedBy,
      occurredAt: action.at,
      payload: { questionId: targetQuestionId },
    },
  );
}

function pauseSession(
  session: PracticeSession,
  action: Extract<PracticeSessionAction, { type: "pause" }>,
): PracticeSession {
  if (session.activeQuestionEnteredAt === null) {
    return session;
  }

  const timed = recordActiveQuestionTime(session, action.timeEventId, action.at);
  return appendEvent(timed, {
    id: action.eventId,
    learningSpaceId: session.learningSpaceId,
    sessionId: session.id,
    type: "session_paused",
    actor: session.startedBy,
    occurredAt: action.at,
    payload: { reason: action.reason },
  });
}

function resumeSession(
  session: PracticeSession,
  action: Extract<PracticeSessionAction, { type: "resume" }>,
): PracticeSession {
  if (session.activeQuestionEnteredAt !== null) {
    return session;
  }

  const resumed = {
    ...session,
    activeQuestionEnteredAt:
      Date.parse(action.at) < Date.parse(session.deadlineAt) ? action.at : null,
  };
  return appendEvent(resumed, {
    id: action.eventId,
    learningSpaceId: session.learningSpaceId,
    sessionId: session.id,
    type: "session_resumed",
    actor: session.startedBy,
    occurredAt: action.at,
    payload: { reason: action.reason },
  });
}

function openSubmission(
  session: PracticeSession,
  action: Extract<PracticeSessionAction, { type: "open-submission" }>,
): PracticeSession {
  return appendEvent(session, {
    id: action.eventId,
    learningSpaceId: session.learningSpaceId,
    sessionId: session.id,
    type: "submission_opened",
    actor: session.startedBy,
    occurredAt: action.at,
    payload: {
      unansweredCount: action.totalQuestions - Object.keys(session.answers).length,
    },
  });
}

function finalize(
  session: PracticeSession,
  action: Extract<PracticeSessionAction, { type: "submit" | "expire" }>,
): PracticeSession {
  const timed = recordActiveQuestionTime(session, action.timeEventId, action.at);
  const status = action.type === "submit" ? "submitted" : "expired";

  return appendEvent(
    { ...timed, status, submittedAt: action.at },
    {
      id: action.eventId,
      learningSpaceId: session.learningSpaceId,
      sessionId: session.id,
      type: action.type === "submit" ? "session_submitted" : "session_expired",
      actor: session.startedBy,
      occurredAt: action.at,
      payload: { answeredCount: Object.keys(session.answers).length },
    },
  );
}

export function practiceSessionReducer(
  session: PracticeSession,
  action: PracticeSessionAction,
): PracticeSession {
  if (session.status !== "active") {
    return session;
  }

  switch (action.type) {
    case "answer":
      return answerQuestion(session, action);
    case "toggle-mark":
      return toggleMark(session, action);
    case "view":
      return viewQuestion(session, action);
    case "pause":
      return pauseSession(session, action);
    case "resume":
      return resumeSession(session, action);
    case "open-submission":
      return openSubmission(session, action);
    case "submit":
    case "expire":
      return finalize(session, action);
  }
}
