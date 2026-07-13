import { describe, expect, it } from "vitest";
import { practiceSessionReducer } from "../../../../src/features/practice/domain/reducer.js";
import { createPracticeSession } from "../../../../src/features/practice/domain/session.js";

function createStartedSession() {
  return createPracticeSession({
    id: "ses_reference-one",
    learnerSpaceId: "lsp_local-demo",
    actor: { kind: "student", userId: "usr_local-demo" },
    startedAt: "2026-07-13T00:00:00.000Z",
    eventId: "evt_started-one",
  });
}

describe("practice session domain", () => {
  it("starts a learner-owned 75-minute session with one ledger event", () => {
    const session = createStartedSession();

    expect(session).toMatchObject({
      schemaVersion: 1,
      id: "ses_reference-one",
      learnerSpaceId: "lsp_local-demo",
      startedBy: { kind: "student", userId: "usr_local-demo" },
      paperId: "tmua-2023-p1",
      status: "active",
      startedAt: "2026-07-13T00:00:00.000Z",
      deadlineAt: "2026-07-13T01:15:00.000Z",
      currentQuestion: 1,
      answers: {},
      markedQuestionIds: [],
      timingByQuestionMs: {},
      activeQuestionEnteredAt: "2026-07-13T00:00:00.000Z",
    });
    expect(session.events).toHaveLength(1);
    expect(session.events[0]).toMatchObject({
      id: "evt_started-one",
      learnerSpaceId: "lsp_local-demo",
      sessionId: "ses_reference-one",
      sequence: 1,
      type: "session_started",
      payload: {
        paperId: "tmua-2023-p1",
        deadlineAt: "2026-07-13T01:15:00.000Z",
      },
    });
  });

  it("records an answer change without losing the original event", () => {
    const started = createStartedSession();
    const first = practiceSessionReducer(started, {
      type: "answer",
      eventId: "evt_answer-one",
      questionId: "tmua-2023-p1-q01",
      answer: "A",
      at: "2026-07-13T00:01:00.000Z",
    });
    const changed = practiceSessionReducer(first, {
      type: "answer",
      eventId: "evt_answer-two",
      questionId: "tmua-2023-p1-q01",
      answer: "F",
      at: "2026-07-13T00:02:00.000Z",
    });

    expect(changed.answers["tmua-2023-p1-q01"]).toBe("F");
    expect(changed.events.map((event) => event.type)).toEqual([
      "session_started",
      "answer_selected",
      "answer_changed",
    ]);
    expect(changed.events[2]?.payload).toEqual({
      questionId: "tmua-2023-p1-q01",
      from: "A",
      to: "F",
    });
  });

  it("does not record a second event when the same answer is selected", () => {
    const first = practiceSessionReducer(createStartedSession(), {
      type: "answer",
      eventId: "evt_answer-one",
      questionId: "tmua-2023-p1-q01",
      answer: "A",
      at: "2026-07-13T00:01:00.000Z",
    });

    expect(
      practiceSessionReducer(first, {
        type: "answer",
        eventId: "evt_answer-two",
        questionId: "tmua-2023-p1-q01",
        answer: "A",
        at: "2026-07-13T00:02:00.000Z",
      }),
    ).toBe(first);
  });

  it("toggles a review mark with explicit ledger events", () => {
    const marked = practiceSessionReducer(createStartedSession(), {
      type: "toggle-mark",
      eventId: "evt_mark-one",
      questionId: "tmua-2023-p1-q01",
      at: "2026-07-13T00:01:00.000Z",
    });
    const unmarked = practiceSessionReducer(marked, {
      type: "toggle-mark",
      eventId: "evt_unmark-one",
      questionId: "tmua-2023-p1-q01",
      at: "2026-07-13T00:02:00.000Z",
    });

    expect(marked.markedQuestionIds).toEqual(["tmua-2023-p1-q01"]);
    expect(unmarked.markedQuestionIds).toEqual([]);
    expect(unmarked.events.slice(-2).map((event) => event.type)).toEqual([
      "question_marked",
      "question_unmarked",
    ]);
  });

  it("records active time before viewing the next question", () => {
    const viewed = practiceSessionReducer(createStartedSession(), {
      type: "view",
      eventId: "evt_view-two",
      timeEventId: "evt_time-one",
      questionNumber: 2,
      at: "2026-07-13T00:00:42.500Z",
    });

    expect(viewed.currentQuestion).toBe(2);
    expect(viewed.activeQuestionEnteredAt).toBe("2026-07-13T00:00:42.500Z");
    expect(viewed.timingByQuestionMs["tmua-2023-p1-q01"]).toBe(42_500);
    expect(viewed.events.slice(-2)).toEqual([
      expect.objectContaining({
        id: "evt_time-one",
        type: "question_time_recorded",
        payload: { questionId: "tmua-2023-p1-q01", activeMs: 42_500 },
      }),
      expect.objectContaining({
        id: "evt_view-two",
        type: "question_viewed",
        payload: { questionId: "tmua-2023-p1-q02" },
      }),
    ]);
  });

  it("records submission intent without finalizing", () => {
    const opened = practiceSessionReducer(createStartedSession(), {
      type: "open-submission",
      eventId: "evt_submission-opened",
      at: "2026-07-13T00:05:00.000Z",
      totalQuestions: 20,
    });

    expect(opened.status).toBe("active");
    expect(opened.events.at(-1)).toMatchObject({
      type: "submission_opened",
      payload: { unansweredCount: 20 },
    });
  });

  it("finalizes only once and records the last active-question time", () => {
    const started = createStartedSession();
    const submitted = practiceSessionReducer(started, {
      type: "submit",
      eventId: "evt_submit-one",
      timeEventId: "evt_time-final",
      at: "2026-07-13T00:10:00.000Z",
      reason: "student",
    });
    const repeated = practiceSessionReducer(submitted, {
      type: "submit",
      eventId: "evt_submit-two",
      timeEventId: "evt_time-repeat",
      at: "2026-07-13T00:11:00.000Z",
      reason: "student",
    });

    expect(submitted.status).toBe("submitted");
    expect(submitted.submittedAt).toBe("2026-07-13T00:10:00.000Z");
    expect(submitted.timingByQuestionMs["tmua-2023-p1-q01"]).toBe(600_000);
    expect(submitted.events.slice(-2).map((event) => event.type)).toEqual([
      "question_time_recorded",
      "session_submitted",
    ]);
    expect(repeated).toBe(submitted);
  });

  it("uses the same finalization path for timer expiry", () => {
    const expired = practiceSessionReducer(createStartedSession(), {
      type: "expire",
      eventId: "evt_expired-one",
      timeEventId: "evt_time-expired",
      at: "2026-07-13T01:15:00.000Z",
    });

    expect(expired.status).toBe("expired");
    expect(expired.events.at(-1)?.type).toBe("session_expired");
  });

  it("ignores answer, mark, and navigation actions after finalization", () => {
    const submitted = practiceSessionReducer(createStartedSession(), {
      type: "submit",
      eventId: "evt_submit-one",
      timeEventId: "evt_time-final",
      at: "2026-07-13T00:10:00.000Z",
      reason: "student",
    });

    const answerAttempt = practiceSessionReducer(submitted, {
      type: "answer",
      eventId: "evt_late-answer",
      questionId: "tmua-2023-p1-q01",
      answer: "F",
      at: "2026-07-13T00:11:00.000Z",
    });
    const viewAttempt = practiceSessionReducer(submitted, {
      type: "view",
      eventId: "evt_late-view",
      timeEventId: "evt_late-time",
      questionNumber: 2,
      at: "2026-07-13T00:11:00.000Z",
    });

    expect(answerAttempt).toBe(submitted);
    expect(viewAttempt).toBe(submitted);
  });
});
