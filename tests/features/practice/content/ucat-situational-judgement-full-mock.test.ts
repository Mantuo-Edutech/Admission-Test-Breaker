import { describe, expect, it } from "vitest";
import {
  getPracticePaper,
  loadPracticePaper,
} from "../../../../src/features/practice/content/practice-paper-registry.js";
import { UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK } from "../../../../src/features/practice/content/ucat-situational-judgement-full-mock.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";
import {
  mostLeastAnswerIsComplete,
  parseMostLeastAnswer,
  serializeMostLeastAnswer,
} from "../../../../src/features/practice/domain/most-least-response.js";
import { calculateResults } from "../../../../src/features/practice/domain/results.js";
import { createPracticeSession, type PracticeSession } from "../../../../src/features/practice/domain/session.js";

function submittedSession(answers: Record<string, string>): PracticeSession {
  return {
    ...createPracticeSession({
      id: "ses_ucat-sjt-full-results",
      learningSpaceId: "lsp_ucat-sjt-full-results",
      actor: { kind: "guest", actorId: "gst_ucat-sjt-full-results" },
      paperId: UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.id,
      durationMinutes: 26,
      startedAt: "2026-07-19T08:00:00.000Z",
      eventId: "evt_ucat-sjt-full-started",
    }),
    status: "submitted",
    submittedAt: "2026-07-19T08:20:00.000Z",
    activeQuestionEnteredAt: null,
    answers,
  };
}

describe("UCAT Situational Judgement original full mock", () => {
  it("loads a complete 69-question, 26-minute paper with 21 scenarios", () => {
    expect(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK).toMatchObject({
      id: "ucat-situational-judgement-full-mock-v1",
      exam: "UCAT",
      sectionId: "situational-judgement",
      durationMinutes: 26,
      calculator: "none",
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.questions).toHaveLength(69);
    expect(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.passages).toHaveLength(21);
    expect(validatePracticePaper(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK)).toEqual([]);
  });

  it("covers six appropriateness, six importance and nine most/least scenarios", () => {
    const questions = UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.questions;
    const ordinal = questions.filter((question) => question.responseMode === "ordinal-choice");
    const mostLeast = questions.filter((question) => question.responseMode === "most-least-choice");
    expect(ordinal).toHaveLength(60);
    expect(ordinal.filter((question) => question.skillTags.includes("appropriateness"))).toHaveLength(30);
    expect(ordinal.filter((question) => question.skillTags.includes("importance"))).toHaveLength(30);
    expect(mostLeast).toHaveLength(9);
    expect(mostLeast.every((question) =>
      question.options.length === 3 && question.scoring?.kind === "most-least-exact"
    )).toBe(true);

    const passageCounts = new Map<string, number>();
    for (const question of questions) {
      passageCounts.set(question.passageId!, (passageCounts.get(question.passageId!) ?? 0) + 1);
    }
    expect([...passageCounts.values()].filter((count) => count === 5)).toHaveLength(12);
    expect([...passageCounts.values()].filter((count) => count === 1)).toHaveLength(9);
  });

  it("pins every rating key and every most/least pair", () => {
    const ratingKey = UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.questions
      .filter((question) => question.responseMode === "ordinal-choice")
      .map((question) => question.correctAnswer)
      .join("");
    expect(ratingKey.match(/.{5}/gu)).toEqual([
      "ADCAD", "ADCAD", "ADCAB", "ADDAC", "ADDAC", "ADACD",
      "AADAB", "AADBC", "AABDA", "AADBB", "AAADB", "ABACD",
    ]);
    expect(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.questions
      .filter((question) => question.responseMode === "most-least-choice")
      .map((question) => parseMostLeastAnswer(question.correctAnswer)))
      .toEqual([
        { most: "A", least: "C" },
        { most: "A", least: "B" },
        { most: "A", least: "B" },
        { most: "A", least: "B" },
        { most: "A", least: "B" },
        { most: "A", least: "B" },
        { most: "A", least: "B" },
        { most: "A", least: "C" },
        { most: "A", least: "B" },
      ]);
  });

  it("stores distinct most/least choices and applies only the published Mantou raw rule", () => {
    const correctPair = serializeMostLeastAnswer({ most: "A", least: "C" });
    expect(parseMostLeastAnswer(correctPair)).toEqual({ most: "A", least: "C" });
    expect(mostLeastAnswerIsComplete(correctPair)).toBe(true);
    expect(mostLeastAnswerIsComplete(serializeMostLeastAnswer({ most: "A" }))).toBe(false);
    expect(mostLeastAnswerIsComplete(serializeMostLeastAnswer({ most: "A", least: "A" }))).toBe(false);

    const results = calculateResults(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK, submittedSession({
      "ucat-situational-judgement-full-mock-v1-q01": "B",
      "ucat-situational-judgement-full-mock-v1-q61": correctPair,
      "ucat-situational-judgement-full-mock-v1-q62": serializeMostLeastAnswer({ most: "C", least: "B" }),
    }));
    expect(results).toMatchObject({
      score: 1.5,
      maxScore: 69,
      correctCount: 1,
      partialCount: 1,
      incorrectCount: 1,
      unansweredCount: 66,
    });
    expect(results.questions[0]).toMatchObject({ status: "partial", points: 0.5 });
    expect(results.questions[60]).toMatchObject({ status: "correct", points: 1 });
    expect(results.questions[61]).toMatchObject({ status: "incorrect", points: 0 });
  });

  it("keeps official anchors internal and loads the large paper only on demand", async () => {
    expect(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.sourceAnchors.map((source) => source.sha256)).toEqual([
      "9aa4a93bddcc62bf53c6196f2b38ac40240a1f781154590c772c68f179d52dbf",
      "f847c156d8c6f31f77dff7edd761251a656ab29a9ab5f8614ca41594ebd9df7d",
      "77c41da22b43e6aa02d16a7d51da4ab1a53e37cb37e7e25b30a386c0b62e267b",
    ]);
    expect(JSON.stringify(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK)).not.toContain("source-pdf");
    expect(getPracticePaper(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.id)).toBeNull();
    await expect(loadPracticePaper(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.id))
      .resolves.toBe(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK);
    expect(getPracticePaper(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK.id))
      .toBe(UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK);
  });
});
