import { describe, expect, it } from "vitest";
import { TMUA_2023_P1 } from "../../../../src/features/practice/content/tmua-2023-p1.js";
import { calculateResults } from "../../../../src/features/practice/domain/results.js";
import { createPracticeSession } from "../../../../src/features/practice/domain/session.js";

function finalizedSession() {
  return {
    ...createPracticeSession({
      id: "ses_results-one",
      learnerSpaceId: "lsp_local-demo",
      actor: { kind: "student", userId: "usr_local-demo" },
      startedAt: "2026-07-13T00:00:00.000Z",
      eventId: "evt_results-started",
    }),
    status: "submitted" as const,
    submittedAt: "2026-07-13T00:10:00.000Z",
    answers: {
      "tmua-2023-p1-q01": "F",
      "tmua-2023-p1-q02": "C",
    },
    markedQuestionIds: ["tmua-2023-p1-q02"],
    timingByQuestionMs: {
      "tmua-2023-p1-q01": 60_000,
      "tmua-2023-p1-q02": 30_000,
      "tmua-2023-p1-q03": 10_000,
    },
  };
}

describe("deterministic practice results", () => {
  it("calculates score, answer states, and timing only from reviewed evidence", () => {
    const results = calculateResults(TMUA_2023_P1, finalizedSession());

    expect(results).toMatchObject({
      score: 1,
      totalQuestions: 20,
      percentage: 5,
      correctCount: 1,
      incorrectCount: 1,
      unansweredCount: 18,
      totalActiveMs: 100_000,
      averagePerQuestionMs: 5_000,
      longestQuestionIds: [
        "tmua-2023-p1-q01",
        "tmua-2023-p1-q02",
        "tmua-2023-p1-q03",
      ],
    });
    expect(results.questions[0]).toMatchObject({
      questionId: "tmua-2023-p1-q01",
      number: 1,
      selectedAnswer: "F",
      correctAnswer: "F",
      status: "correct",
      timeMs: 60_000,
      marked: false,
      knowledgeTags: ["integration"],
    });
    expect(results.questions[1]).toMatchObject({
      status: "incorrect",
      selectedAnswer: "C",
      correctAnswer: "A",
      marked: true,
    });
    expect(results.questions[2]).toMatchObject({
      status: "unanswered",
      selectedAnswer: null,
      timeMs: 10_000,
    });
    expect("percentile" in results).toBe(false);
    expect("predictedScore" in results).toBe(false);
  });

  it("builds transparent topic summaries without inventing population data", () => {
    const results = calculateResults(TMUA_2023_P1, finalizedSession());
    const integration = results.topics.find(
      (topic) => topic.knowledgeTag === "integration",
    );

    expect(integration).toEqual({
      knowledgeTag: "integration",
      totalQuestions: 2,
      attemptedCount: 1,
      correctCount: 1,
      activeMs: 70_000,
    });
  });

  it("refuses to reveal a result while the session remains active", () => {
    const active = createPracticeSession({
      id: "ses_active-one",
      learnerSpaceId: "lsp_local-demo",
      actor: { kind: "student", userId: "usr_local-demo" },
      startedAt: "2026-07-13T00:00:00.000Z",
      eventId: "evt_active-started",
    });

    expect(() => calculateResults(TMUA_2023_P1, active)).toThrow(
      /active session/,
    );
  });
});
