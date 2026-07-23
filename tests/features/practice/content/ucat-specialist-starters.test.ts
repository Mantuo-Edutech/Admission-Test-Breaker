import { describe, expect, it } from "vitest";
import { getPracticePaper } from "../../../../src/features/practice/content/practice-paper-registry.js";
import { UCAT_DECISION_MAKING_STARTER } from "../../../../src/features/practice/content/ucat-decision-making-starter.js";
import { UCAT_SITUATIONAL_JUDGEMENT_STARTER } from "../../../../src/features/practice/content/ucat-situational-judgement-starter.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";
import { calculateResults } from "../../../../src/features/practice/domain/results.js";
import { createPracticeSession, type PracticeSession } from "../../../../src/features/practice/domain/session.js";
import { serializeStatementAnswers } from "../../../../src/features/practice/domain/statement-response.js";

function submittedSession(paperId: string, durationMinutes: number, answers: Record<string, string>): PracticeSession {
  return {
    ...createPracticeSession({
      id: `ses_${paperId}`,
      learningSpaceId: "lsp_specialist-results",
      actor: { kind: "guest", actorId: "gst_specialist-results" },
      paperId,
      durationMinutes,
      startedAt: "2026-07-18T08:00:00.000Z",
      eventId: `evt_${paperId}-started`,
    }),
    status: "submitted",
    submittedAt: "2026-07-18T08:10:00.000Z",
    activeQuestionEnteredAt: null,
    answers,
  };
}

describe("UCAT specialist Decision Making and SJT starters", () => {
  it("loads a mixed Decision Making paper with two five-statement questions", () => {
    expect(UCAT_DECISION_MAKING_STARTER).toMatchObject({
      id: "ucat-decision-making-starter-v1",
      exam: "UCAT",
      durationMinutes: 10,
      calculator: "basic",
      publicationStatus: "teaching-preview",
    });
    expect(UCAT_DECISION_MAKING_STARTER.questions).toHaveLength(8);
    const statementSets = UCAT_DECISION_MAKING_STARTER.questions.filter((question) => question.responseMode === "statement-set");
    expect(statementSets).toHaveLength(2);
    expect(statementSets.every((question) => question.statements?.length === 5)).toBe(true);
    expect(statementSets.every((question) => question.scoring?.kind === "statement-set-two-point")).toBe(true);
    expect(validatePracticePaper(UCAT_DECISION_MAKING_STARTER)).toEqual([]);
    expect(getPracticePaper(UCAT_DECISION_MAKING_STARTER.id)).toBe(UCAT_DECISION_MAKING_STARTER);
  });

  it("loads ten ordinal SJT questions with an explicit adjacent partial-credit scale", () => {
    expect(UCAT_SITUATIONAL_JUDGEMENT_STARTER).toMatchObject({
      id: "ucat-situational-judgement-starter-v1",
      exam: "UCAT",
      durationMinutes: 5,
      publicationStatus: "teaching-preview",
    });
    expect(UCAT_SITUATIONAL_JUDGEMENT_STARTER.passages).toHaveLength(3);
    expect(UCAT_SITUATIONAL_JUDGEMENT_STARTER.questions).toHaveLength(10);
    expect(UCAT_SITUATIONAL_JUDGEMENT_STARTER.questions.map((question) => question.correctAnswer).join(""))
      .toBe("ADDADADDAC");
    expect(UCAT_SITUATIONAL_JUDGEMENT_STARTER.questions.every((question) =>
      question.responseMode === "ordinal-choice" &&
      question.scoring?.kind === "adjacent-partial" &&
      question.scoring.order.join("") === "ABCD"
    )).toBe(true);
    expect(validatePracticePaper(UCAT_SITUATIONAL_JUDGEMENT_STARTER)).toEqual([]);
    expect(getPracticePaper(UCAT_SITUATIONAL_JUDGEMENT_STARTER.id)).toBe(UCAT_SITUATIONAL_JUDGEMENT_STARTER);
  });

  it("awards Decision Making statement sets 2 points for all correct and 1 for one error", () => {
    const results = calculateResults(UCAT_DECISION_MAKING_STARTER, submittedSession(
      UCAT_DECISION_MAKING_STARTER.id,
      10,
      {
        "ucat-decision-making-starter-v1-q01": "B",
        "ucat-decision-making-starter-v1-q02": "A",
        "ucat-decision-making-starter-v1-q04": serializeStatementAnswers({
          "archive-sealed": "yes",
          "cedar-not-transparent": "yes",
          "archive-transparent": "no",
          "sealed-cedar": "yes",
          "archive-not-metal": "yes",
        }),
        "ucat-decision-making-starter-v1-q07": serializeStatementAnswers({
          "a-rate": "yes",
          "b-cost": "yes",
          "b-highest": "no",
          "combined-rate": "no",
          "a-increase": "yes",
        }),
      },
    ));

    expect(results).toMatchObject({ score: 4, maxScore: 10, percentage: 40, correctCount: 2, partialCount: 1, incorrectCount: 1, unansweredCount: 4 });
    expect(results.questions[3]).toMatchObject({ status: "partial", points: 1, maxPoints: 2 });
    expect(results.questions[6]).toMatchObject({ status: "correct", points: 2, maxPoints: 2 });
  });

  it("awards SJT adjacent responses half a point without calling them correct", () => {
    const results = calculateResults(UCAT_SITUATIONAL_JUDGEMENT_STARTER, submittedSession(
      UCAT_SITUATIONAL_JUDGEMENT_STARTER.id,
      5,
      {
        "ucat-situational-judgement-starter-v1-q01": "B",
        "ucat-situational-judgement-starter-v1-q02": "D",
        "ucat-situational-judgement-starter-v1-q03": "A",
      },
    ));

    expect(results).toMatchObject({ score: 1.5, maxScore: 10, percentage: 15, correctCount: 1, partialCount: 1, incorrectCount: 1, unansweredCount: 7 });
    expect(results.questions[0]).toMatchObject({ status: "partial", points: 0.5, maxPoints: 1 });
    expect(results.questions[1]).toMatchObject({ status: "correct", points: 1, maxPoints: 1 });
    expect(results.questions[2]).toMatchObject({ status: "incorrect", points: 0, maxPoints: 1 });
  });

  it("rejects incomplete statement metadata and malformed ordinal order", () => {
    const brokenStatement = structuredClone(UCAT_DECISION_MAKING_STARTER);
    brokenStatement.questions[3]!.statements![0]!.correctAnswer = "maybe" as "yes";
    expect(validatePracticePaper(brokenStatement).map((issue) => issue.code)).toContain("invalid-statement-set");

    const brokenOrdinal = structuredClone(UCAT_SITUATIONAL_JUDGEMENT_STARTER);
    brokenOrdinal.questions[0]!.scoring = { kind: "adjacent-partial", order: ["A", "B", "C", "C"] };
    expect(validatePracticePaper(brokenOrdinal).map((issue) => issue.code)).toContain("invalid-ordinal-scoring");
  });
});
