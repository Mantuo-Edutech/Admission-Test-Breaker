import { describe, expect, it } from "vitest";
import {
  getPracticePaper,
  loadPracticePaper,
} from "../../../../src/features/practice/content/practice-paper-registry.js";
import { UCAT_DECISION_MAKING_FULL_MOCK } from "../../../../src/features/practice/content/ucat-decision-making-full-mock.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";
import { calculateResults } from "../../../../src/features/practice/domain/results.js";
import { createPracticeSession } from "../../../../src/features/practice/domain/session.js";
import { serializeStatementAnswers } from "../../../../src/features/practice/domain/statement-response.js";

const EXPECTED_TAGS = [
  "ucat-dm-ordering",
  "ucat-dm-deduction",
  "ucat-dm-bayes-table",
  "ucat-dm-syllogisms",
  "ucat-dm-venn-counting",
  "ucat-dm-strongest-argument",
  "ucat-dm-data-inference",
  "ucat-dm-probability",
] as const;

describe("UCAT Decision Making original full mock", () => {
  it("loads the complete 35-question, 37-minute specialist paper", () => {
    expect(UCAT_DECISION_MAKING_FULL_MOCK).toMatchObject({
      id: "ucat-decision-making-full-mock-v1",
      exam: "UCAT",
      sectionId: "decision-making",
      durationMinutes: 37,
      calculator: "basic",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(UCAT_DECISION_MAKING_FULL_MOCK.questions).toHaveLength(35);
    expect(UCAT_DECISION_MAKING_FULL_MOCK.passages).toHaveLength(6);
    expect(validatePracticePaper(UCAT_DECISION_MAKING_FULL_MOCK)).toEqual([]);
  });

  it("uses six five-statement items and twenty-nine four-option items", () => {
    const statementSets = UCAT_DECISION_MAKING_FULL_MOCK.questions.filter(
      (question) => question.responseMode === "statement-set",
    );
    const singleAnswerQuestions = UCAT_DECISION_MAKING_FULL_MOCK.questions.filter(
      (question) => question.responseMode !== "statement-set",
    );

    expect(statementSets.map((question) => question.number)).toEqual([5, 10, 16, 22, 28, 34]);
    expect(statementSets.every((question) =>
      question.statements?.length === 5 && question.scoring?.kind === "statement-set-two-point"
    )).toBe(true);
    expect(singleAnswerQuestions).toHaveLength(29);
    expect(singleAnswerQuestions.every((question) => question.options.length === 4)).toBe(true);
    expect(singleAnswerQuestions.length + statementSets.length * 2).toBe(41);
  });

  it("pins the independently checked answer key and all eight reasoning families", () => {
    expect(UCAT_DECISION_MAKING_FULL_MOCK.questions.map((question) => question.correctAnswer)).toEqual([
      "A", "A", "B", "C", "", "A", "B", "B", "C", "",
      "B", "B", "C", "B", "C", "", "A", "D", "D", "B",
      "C", "", "C", "B", "A", "B", "A", "", "C", "A",
      "B", "B", "B", "", "C",
    ]);
    expect(UCAT_DECISION_MAKING_FULL_MOCK.questions
      .filter((question) => question.responseMode === "statement-set")
      .map((question) => question.statements?.map((statement) => statement.correctAnswer[0]).join("")))
      .toEqual(["yynnn", "yyynn", "ynyny", "yyynn", "yynny", "yyynn"]);
    expect(new Set(UCAT_DECISION_MAKING_FULL_MOCK.questions.flatMap((question) => question.knowledgeTags)))
      .toEqual(new Set(EXPECTED_TAGS));
  });

  it("checks the numerical and constraint answers without relying on generated copy", () => {
    expect((600 / 120) < (540 / 90)).toBe(true);
    expect((30 + 45 + 18) / (120 + 150 + 90)).not.toBe(0.26);
    expect((80 / (80 + 190))).toBeCloseTo(8 / 27);
    expect(0.6 * 500 - 0.4 * 200 - 100).toBe(120);
    expect(180 - (110 + 90 - 50)).toBe(30);
    expect(42 + 38 - 70).toBe(10);
    expect(1 - 0.9 * 0.8).toBeCloseTo(0.28);
    expect((90 / (90 + 245))).toBeCloseTo(18 / 67);
    expect(95 + 80 - 140).toBe(35);

    const validClinicOrders = [
      ["A", "D", "B", "E", "C"],
      ["A", "E", "D", "B", "C"],
      ["D", "B", "A", "E", "C"],
      ["D", "B", "E", "A", "C"],
    ];
    expect(validClinicOrders.every((order) =>
      order[4] === "C" &&
      order.indexOf("A") < order.indexOf("C") &&
      order.indexOf("B") === order.indexOf("D") + 1 &&
      ![0, 4].includes(order.indexOf("E"))
    )).toBe(true);
    expect(validClinicOrders.filter((order) => order[1] === "E")).toEqual([
      ["A", "E", "D", "B", "C"],
    ]);
  });

  it("scores five-statement questions with the existing 2/1/0 raw-mark rule", () => {
    const question = UCAT_DECISION_MAKING_FULL_MOCK.questions[4]!;
    const session = {
      ...createPracticeSession({
        id: "ses_ucat-dm-full-score",
        learningSpaceId: "gsp_ucat-dm-full-score",
        actor: { kind: "guest" as const, actorId: "gst_ucat-dm-full-score" },
        paperId: UCAT_DECISION_MAKING_FULL_MOCK.id,
        durationMinutes: 37,
        startedAt: "2026-07-19T22:00:00.000Z",
        eventId: "evt_ucat-dm-full-score-started",
      }),
      status: "submitted" as const,
      submittedAt: "2026-07-19T22:01:00.000Z",
      activeQuestionEnteredAt: null,
      answers: {
        [question.id]: serializeStatementAnswers({
          "visits-total": "yes",
          "south-follow-up-rate": "yes",
          "north-highest-satisfaction": "no",
          "west-lower-cost": "no",
          "combined-follow-up-rate": "yes",
        }),
      },
    };

    const results = calculateResults(UCAT_DECISION_MAKING_FULL_MOCK, session);
    expect(results).toMatchObject({ score: 1, maxScore: 41, partialCount: 1, unansweredCount: 34 });
    expect(results.questions[4]).toMatchObject({ status: "partial", points: 1, maxPoints: 2 });
  });

  it("keeps official anchors internal and loads the large paper only on demand", async () => {
    expect(UCAT_DECISION_MAKING_FULL_MOCK.sourceAnchors.map((source) => source.sha256)).toEqual([
      "9aa4a93bddcc62bf53c6196f2b38ac40240a1f781154590c772c68f179d52dbf",
      "a659bedc40b1a603cb755e75121a19a633889d2aab62b66d62378e804f7b8c7c",
    ]);
    expect(JSON.stringify(UCAT_DECISION_MAKING_FULL_MOCK)).not.toContain("source-pdf");
    expect(getPracticePaper(UCAT_DECISION_MAKING_FULL_MOCK.id)).toBeNull();
    await expect(loadPracticePaper(UCAT_DECISION_MAKING_FULL_MOCK.id))
      .resolves.toBe(UCAT_DECISION_MAKING_FULL_MOCK);
    expect(getPracticePaper(UCAT_DECISION_MAKING_FULL_MOCK.id))
      .toBe(UCAT_DECISION_MAKING_FULL_MOCK);
  });
});
